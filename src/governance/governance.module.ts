import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceService } from './services/governance.service';
import { ProposalService } from './services/proposal.service';
import { VotingService } from './services/voting.service';
import { TokenService } from './services/token.service';
import { StakingService } from './services/staking.service';
import { GovernanceController } from './controllers/governance.controller';
import { ProposalController } from './controllers/proposal.controller';
import { VotingController } from './controllers/voting.controller';
import { TokenController } from './controllers/token.controller';
import { StakingController } from './controllers/staking.controller';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { Stake } from './entities/stake.entity';
import { Delegation } from './entities/delegation.entity';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Proposal,
      Vote,
      Stake,
      Delegation,
    ]),
    BlockchainModule,
    UsersModule,
  ],
  controllers: [
    GovernanceController,
    ProposalController,
    VotingController,
    TokenController,
    StakingController,
  ],
  providers: [
    GovernanceService,
    ProposalService,
    VotingService,
    TokenService,
    StakingService,
  ],
  exports: [
    GovernanceService,
    ProposalService,
    VotingService,
    TokenService,
    StakingService,
  ],
})
export class GovernanceModule {}