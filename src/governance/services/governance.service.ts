import { Injectable } from '@nestjs/common';
import { ProposalService } from './proposal.service';
import { VotingService } from './voting.service';
import { TokenService } from './token.service';
import { StakingService } from './staking.service';

@Injectable()
export class GovernanceService {
  constructor(
    private readonly proposalService: ProposalService,
    private readonly votingService: VotingService,
    private readonly tokenService: TokenService,
    private readonly stakingService: StakingService,
  ) {}

  async getGovernanceOverview(userId: string) {
    const [
      activeProposals,
      userVotingPower,
      userStakes,
      tokenBalance,
    ] = await Promise.all([
      this.proposalService.getActiveProposals(),
      this.votingService.getUserVotingPower(userId),
      this.stakingService.getUserStakes(userId),
      this.tokenService.getUserTokenBalance(userId),
    ]);

    return {
      activeProposals,
      userVotingPower,
      userStakes,
      tokenBalance,
      governanceStats: await this.getGovernanceStats(),
    };
  }

  async getGovernanceStats() {
    const totalProposals = await this.proposalService.getTotalProposalsCount();
    const totalVotes = await this.votingService.getTotalVotesCount();
    const totalStaked = await this.stakingService.getTotalStakedAmount();
    const participationRate = await this.votingService.getParticipationRate();

    return {
      totalProposals,
      totalVotes,
      totalStaked,
      participationRate,
    };
  }

  async executePassedProposals() {
    const passedProposals = await this.proposalService.getPassedProposalsReadyForExecution();
    
    for (const proposal of passedProposals) {
      await this.proposalService.executeProposal(proposal.id);
    }
    
    return passedProposals.length;
  }
}