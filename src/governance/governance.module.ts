import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { GovernanceToken } from './entities/governance-token.entity';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { Contribution } from './entities/contribution.entity';
import { Staking } from './entities/staking.entity';

// Services
import { GovernanceTokenService } from './services/governance-token.service';
import { ProposalService } from './services/proposal.service';
import { VotingService } from './services/voting.service';
import { ContributionService } from './services/contribution.service';
import { StakingService } from './services/staking.service';

// Controllers
import { GovernanceTokenController } from './controllers/governance-token.controller';
import { ProposalController } from './controllers/proposal.controller';
import { VotingController } from './controllers/voting.controller';
import { ContributionController } from './controllers/contribution.controller';
import { StakingController } from './controllers/staking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GovernanceToken,
      Proposal,
      Vote,
      Contribution,
      Staking,
    ]),
  ],
  controllers: [
    GovernanceTokenController,
    ProposalController,
    VotingController,
    ContributionController,
    StakingController,
  ],
  providers: [
    GovernanceTokenService,
    ProposalService,
    VotingService,
    ContributionService,
    StakingService,
  ],
  exports: [
    GovernanceTokenService,
    ProposalService,
    VotingService,
    ContributionService,
    StakingService,
  ],
})
export class GovernanceModule {}
