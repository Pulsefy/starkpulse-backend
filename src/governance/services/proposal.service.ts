import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from '../entities/proposal.entity';
import { IProposalService } from '../interfaces/governance.interface';
import { CreateProposalDto, UpdateProposalDto, ProposalFilterDto } from '../dto/proposal.dto';

@Injectable()
export class ProposalService implements IProposalService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
  ) {}

  async createProposal(proposerId: string, dto: CreateProposalDto): Promise<Proposal> {
    const proposal = this.proposalRepository.create({
      ...dto,
      proposerId,
      quorumRequired: dto.quorumRequired || 50000, // Default quorum
      votingPeriodDays: dto.votingPeriodDays || 7,
    });

    return await this.proposalRepository.save(proposal);
  }

  async updateProposal(id: string, dto: UpdateProposalDto): Promise<Proposal> {
    const proposal = await this.getProposal(id);
    
    // Only allow updates if proposal is in DRAFT status
    if (proposal.status !== 'DRAFT') {
      throw new BadRequestException('Only draft proposals can be updated');
    }

    await this.proposalRepository.update(id, dto);
    return this.getProposal(id);
  }

  async getProposal(id: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id },
      relations: ['proposer', 'votes', 'votes.voter'],
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    return proposal;
  }

  async getProposals(filter: ProposalFilterDto): Promise<{ proposals: Proposal[]; total: number }> {
    const queryBuilder = this.proposalRepository.createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.proposer', 'proposer');

    if (filter.status) {
      queryBuilder.andWhere('proposal.status = :status', { status: filter.status });
    }

    if (filter.type) {
      queryBuilder.andWhere('proposal.type = :type', { type: filter.type });
    }

    if (filter.proposerId) {
      queryBuilder.andWhere('proposal.proposerId = :proposerId', { proposerId: filter.proposerId });
    }

    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'DESC';
    queryBuilder.orderBy(`proposal.${sortBy}`, sortOrder);

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [proposals, total] = await queryBuilder.getManyAndCount();

    return { proposals, total };
  }

  async activateProposal(id: string): Promise<Proposal> {
    const proposal = await this.getProposal(id);

    if (proposal.status !== 'DRAFT') {
      throw new BadRequestException('Only draft proposals can be activated');
    }

    const now = new Date();
    const votingEndsAt = new Date(now.getTime() + (proposal.votingPeriodDays * 24 * 60 * 60 * 1000));

    await this.proposalRepository.update(id, {
      status: 'ACTIVE',
      votingStartsAt: now,
      votingEndsAt,
    });

    return this.getProposal(id);
  }

  async finalizeProposal(id: string): Promise<Proposal> {
    const proposal = await this.getProposal(id);

    if (proposal.status !== 'ACTIVE') {
      throw new BadRequestException('Only active proposals can be finalized');
    }

    const now = new Date();
    if (proposal.votingEndsAt > now) {
      throw new BadRequestException('Voting period has not ended yet');
    }

    // Determine if proposal passed
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    const quorumMet = totalVotes >= proposal.quorumRequired;
    const majorityFor = proposal.votesFor > proposal.votesAgainst;

    const newStatus = quorumMet && majorityFor ? 'PASSED' : 'REJECTED';

    await this.proposalRepository.update(id, {
      status: newStatus,
      totalVotes,
    });

    return this.getProposal(id);
  }

  async executeProposal(id: string): Promise<Proposal> {
    const proposal = await this.getProposal(id);

    if (proposal.status !== 'PASSED') {
      throw new BadRequestException('Only passed proposals can be executed');
    }

    // TODO: Implement actual execution logic based on proposal type
    await this.proposalRepository.update(id, {
      status: 'EXECUTED',
      executedAt: new Date(),
    });

    return this.getProposal(id);
  }
}
