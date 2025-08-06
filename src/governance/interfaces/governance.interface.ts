import { GovernanceToken } from '../entities/governance-token.entity';
import { Proposal } from '../entities/proposal.entity';
import { Vote } from '../entities/vote.entity';
import { Contribution } from '../entities/contribution.entity';
import { Staking } from '../entities/staking.entity';
import { CreateGovernanceTokenDto, UpdateGovernanceTokenDto } from '../dto/governance-token.dto';
import { CreateProposalDto, UpdateProposalDto, CastVoteDto, ProposalFilterDto } from '../dto/proposal.dto';
import { CreateContributionDto, ReviewContributionDto, ContributionFilterDto, ContributionStatsDto } from '../dto/contribution.dto';

export interface IGovernanceTokenService {
  createToken(dto: CreateGovernanceTokenDto): Promise<GovernanceToken>;
  updateToken(id: string, dto: UpdateGovernanceTokenDto): Promise<GovernanceToken>;
  getTokenByUserId(userId: string, tokenType?: string): Promise<GovernanceToken>;
  getTokenBalance(userId: string, tokenType?: string): Promise<number>;
  transferTokens(fromUserId: string, toUserId: string, amount: number, tokenType?: string): Promise<boolean>;
  delegateVotingPower(userId: string, delegateId: string, amount: number): Promise<boolean>;
  undelegateVotingPower(userId: string, amount: number): Promise<boolean>;
}

export interface IProposalService {
  createProposal(proposerId: string, dto: CreateProposalDto): Promise<Proposal>;
  updateProposal(id: string, dto: UpdateProposalDto): Promise<Proposal>;
  getProposal(id: string): Promise<Proposal>;
  getProposals(filter: ProposalFilterDto): Promise<{ proposals: Proposal[]; total: number }>;
  activateProposal(id: string): Promise<Proposal>;
  finalizeProposal(id: string): Promise<Proposal>;
  executeProposal(id: string): Promise<Proposal>;
}

export interface IVotingService {
  castVote(voterId: string, dto: CastVoteDto): Promise<Vote>;
  getVote(proposalId: string, voterId: string): Promise<Vote>;
  getVotesForProposal(proposalId: string): Promise<Vote[]>;
  calculateVotingPower(userId: string): Promise<number>;
  updateProposalVoteCounts(proposalId: string): Promise<void>;
}

export interface IContributionService {
  createContribution(userId: string, dto: CreateContributionDto): Promise<Contribution>;
  reviewContribution(id: string, reviewerId: string, dto: ReviewContributionDto): Promise<Contribution>;
  getContribution(id: string): Promise<Contribution>;
  getContributions(filter: ContributionFilterDto): Promise<{ contributions: Contribution[]; total: number }>;
  getContributionStats(userId: string): Promise<ContributionStatsDto>;
  processRewards(contributionId: string): Promise<boolean>;
  calculateContributionScore(contribution: Contribution): Promise<number>;
}

export interface IStakingService {
  stakeTokens(userId: string, amount: number, lockPeriodDays?: number): Promise<Staking>;
  unstakeTokens(stakingId: string): Promise<Staking>;
  delegateStake(stakingId: string, delegateId: string): Promise<Staking>;
  undelegateStake(stakingId: string): Promise<Staking>;
  calculateRewards(stakingId: string): Promise<number>;
  claimRewards(stakingId: string): Promise<number>;
  getStakingInfo(userId: string): Promise<Staking[]>;
}
