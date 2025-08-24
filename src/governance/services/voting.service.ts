import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote, VoteType } from '../entities/vote.entity';
import { Proposal, ProposalStatus } from '../entities/proposal.entity';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { TokenService } from './token.service';

@Injectable()
export class VotingService {
  constructor(
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    private tokenService: TokenService,
  ) {}

  async castVote(createVoteDto: CreateVoteDto, userId: string) {
    const { proposalId, voteType, reason } = createVoteDto;
    
    // Check if proposal exists and is active
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }
    
    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException('Voting is only allowed on active proposals');
    }
    
    if (new Date() > proposal.endTime || new Date() < proposal.startTime) {
      throw new BadRequestException('Voting is not allowed outside the voting period');
    }
    
    // Check if user has already voted
    const existingVote = await this.voteRepository.findOne({
      where: {
        voter: { id: userId },
        proposal: { id: proposalId },
      },
    });
    
    if (existingVote) {
      throw new BadRequestException('User has already voted on this proposal');
    }
    
    // Get user's voting power
    const votingPower = await this.getUserVotingPower(userId);
    
    if (votingPower <= 0) {
      throw new BadRequestException('User has no voting power');
    }
    
    // Create and save vote
    const vote = this.voteRepository.create({
      voter: { id: userId },
      proposal: { id: proposalId },
      voteType,
      votingPower,
      reason,
    });
    
    const savedVote = await this.voteRepository.save(vote);
    
    // Update proposal vote counts
    await this.updateProposalVoteCounts(proposalId);
    
    return savedVote;
  }

  async getUserVotes(userId: string) {
    return this.voteRepository.find({
      where: { voter: { id: userId } },
      relations: ['proposal'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProposalVotes(proposalId: string) {
    return this.voteRepository.find({
      where: { proposal: { id: proposalId } },
      relations: ['voter'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserVotingPower(userId: string): Promise<number> {
    // Get user's token balance and staked amount
    const tokenBalance = await this.tokenService.getUserTokenBalance(userId);
    const stakedAmount = await this.tokenService.getUserStakedAmount(userId);
    const delegatedPower = await this.tokenService.getUserDelegatedVotingPower(userId);
    
    // Calculate voting power based on token holdings and staked amount
    // Staked tokens typically have higher voting power
    const stakingMultiplier = 2; // Staked tokens count double for voting power
    
    return tokenBalance + (stakedAmount * stakingMultiplier) + delegatedPower;
  }

  private async updateProposalVoteCounts(proposalId: string) {
    const votes = await this.voteRepository.find({
      where: { proposal: { id: proposalId } },
    });
    
    let yesVotes = 0;
    let noVotes = 0;
    let abstainVotes = 0;
    
    votes.forEach(vote => {
      switch (vote.voteType) {
        case VoteType.YES:
          yesVotes += Number(vote.votingPower);
          break;
        case VoteType.NO:
          noVotes += Number(vote.votingPower);
          break;
        case VoteType.ABSTAIN:
          abstainVotes += Number(vote.votingPower);
          break;
      }
    });
    
    await this.proposalRepository.update(proposalId, {
      yesVotes,
      noVotes,
      abstainVotes,
    });
  }

  async getTotalVotesCount() {
    return this.voteRepository.count();
  }

  async getParticipationRate() {
    // This is a simplified calculation
    // In a real system, you would compare unique voters to total token holders
    const totalVoters = await this.voteRepository
      .createQueryBuilder('vote')
      .select('vote.voter')
      .distinct(true)
      .getCount();
    
    const totalUsers = 100; // Placeholder - would come from user service
    
    return totalUsers > 0 ? totalVoters / totalUsers : 0;
  }
}