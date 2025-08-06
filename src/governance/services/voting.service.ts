import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote } from '../entities/vote.entity';
import { Proposal } from '../entities/proposal.entity';
import { GovernanceToken } from '../entities/governance-token.entity';
import { IVotingService } from '../interfaces/governance.interface';
import { CastVoteDto } from '../dto/proposal.dto';

@Injectable()
export class VotingService implements IVotingService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
    @InjectRepository(GovernanceToken)
    private readonly tokenRepository: Repository<GovernanceToken>,
  ) {}

  async castVote(voterId: string, dto: CastVoteDto): Promise<Vote> {
    // Check if proposal exists and is active
    const proposal = await this.proposalRepository.findOne({
      where: { id: dto.proposalId }
    });

    if (!proposal) {
      throw new BadRequestException('Proposal not found');
    }

    if (proposal.status !== 'ACTIVE') {
      throw new BadRequestException('Proposal is not active for voting');
    }

    const now = new Date();
    if (now < proposal.votingStartsAt || now > proposal.votingEndsAt) {
      throw new BadRequestException('Voting period has ended or not started');
    }

    // Check if user has already voted
    const existingVote = await this.voteRepository.findOne({
      where: { proposalId: dto.proposalId, voterId }
    });

    if (existingVote) {
      throw new ConflictException('User has already voted on this proposal');
    }

    // Calculate voting power
    const votingPower = await this.calculateVotingPower(voterId);

    if (votingPower <= 0) {
      throw new BadRequestException('User has no voting power');
    }

    // Create and save vote
    const vote = this.voteRepository.create({
      ...dto,
      voterId,
      votingPower,
      weightedVote: votingPower,
    });

    const savedVote = await this.voteRepository.save(vote);

    // Update proposal vote counts
    await this.updateProposalVoteCounts(dto.proposalId);

    return savedVote;
  }

  async getVote(proposalId: string, voterId: string): Promise<Vote> {
    return await this.voteRepository.findOne({
      where: { proposalId, voterId },
      relations: ['voter', 'proposal'],
    });
  }

  async getVotesForProposal(proposalId: string): Promise<Vote[]> {
    return await this.voteRepository.find({
      where: { proposalId },
      relations: ['voter'],
      order: { createdAt: 'DESC' },
    });
  }

  async calculateVotingPower(userId: string): Promise<number> {
    const token = await this.tokenRepository.findOne({
      where: { userId, tokenType: 'GOVERNANCE' }
    });

    if (!token) {
      return 0;
    }

    // Voting power = own tokens + delegated tokens
    return token.votingPower + token.delegatedPower;
  }

  async updateProposalVoteCounts(proposalId: string): Promise<void> {
    const votes = await this.voteRepository.find({
      where: { proposalId }
    });

    let votesFor = 0;
    let votesAgainst = 0;
    let votesAbstain = 0;

    votes.forEach(vote => {
      switch (vote.voteType) {
        case 'FOR':
          votesFor += vote.weightedVote;
          break;
        case 'AGAINST':
          votesAgainst += vote.weightedVote;
          break;
        case 'ABSTAIN':
          votesAbstain += vote.weightedVote;
          break;
      }
    });

    await this.proposalRepository.update(proposalId, {
      votesFor,
      votesAgainst,
      votesAbstain,
      totalVotes: votesFor + votesAgainst + votesAbstain,
    });
  }
}
