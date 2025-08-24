import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal, ProposalStatus } from '../entities/proposal.entity';
import { CreateProposalDto } from '../dto/create-proposal.dto';
import { UpdateProposalDto } from '../dto/update-proposal.dto';

@Injectable()
export class ProposalService {
  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
  ) {}

  async create(createProposalDto: CreateProposalDto, userId: string) {
    const proposal = this.proposalRepository.create({
      ...createProposalDto,
      proposer: { id: userId },
      status: ProposalStatus.DRAFT,
    });
    
    return this.proposalRepository.save(proposal);
  }

  async findAll(filters?: any) {
    return this.proposalRepository.find({
      where: filters,
      relations: ['proposer', 'votes'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const proposal = await this.proposalRepository.findOne({
      where: { id },
      relations: ['proposer', 'votes', 'votes.voter'],
    });
    
    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }
    
    return proposal;
  }

  async update(id: string, updateProposalDto: UpdateProposalDto) {
    const proposal = await this.findOne(id);
    
    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException('Only draft proposals can be updated');
    }
    
    Object.assign(proposal, updateProposalDto);
    return this.proposalRepository.save(proposal);
  }

  async activateProposal(id: string) {
    const proposal = await this.findOne(id);
    
    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException('Only draft proposals can be activated');
    }
    
    proposal.status = ProposalStatus.ACTIVE;
    proposal.startTime = new Date();
    return this.proposalRepository.save(proposal);
  }

  async cancelProposal(id: string, userId: string) {
    const proposal = await this.findOne(id);
    
    if (proposal.proposer.id !== userId) {
      throw new BadRequestException('Only the proposer can cancel the proposal');
    }
    
    if (proposal.status !== ProposalStatus.DRAFT && proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException('Only draft or active proposals can be canceled');
    }
    
    proposal.status = ProposalStatus.CANCELED;
    return this.proposalRepository.save(proposal);
  }

  async executeProposal(id: string) {
    const proposal = await this.findOne(id);
    
    if (proposal.status !== ProposalStatus.PASSED) {
      throw new BadRequestException('Only passed proposals can be executed');
    }
    
    // Here we would implement the actual execution logic
    // This could involve calling smart contract functions
    
    proposal.status = ProposalStatus.EXECUTED;
    proposal.executionTime = new Date();
    proposal.isExecuted = true;
    
    return this.proposalRepository.save(proposal);
  }

  async getActiveProposals() {
    return this.proposalRepository.find({
      where: { status: ProposalStatus.ACTIVE },
      relations: ['proposer'],
      order: { endTime: 'ASC' },
    });
  }

  async getPassedProposalsReadyForExecution() {
    return this.proposalRepository.find({
      where: { 
        status: ProposalStatus.PASSED,
        isExecuted: false,
      },
      relations: ['proposer'],
    });
  }

  async getTotalProposalsCount() {
    return this.proposalRepository.count();
  }

  async finalizeProposalVoting(id: string) {
    const proposal = await this.findOne(id);
    
    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException('Only active proposals can be finalized');
    }
    
    if (new Date() < proposal.endTime) {
      throw new BadRequestException('Voting period has not ended yet');
    }
    
    // Determine if proposal passed based on votes
    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const passThreshold = 0.5; // 50% majority
    
    if (totalVotes > 0 && proposal.yesVotes / totalVotes > passThreshold) {
      proposal.status = ProposalStatus.PASSED;
    } else {
      proposal.status = ProposalStatus.REJECTED;
    }
    
    return this.proposalRepository.save(proposal);
  }
}