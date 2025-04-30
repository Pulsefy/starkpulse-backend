/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';

import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';

import { ContractService } from './services/contract.service';

import { StarknetService } from './services/starknet.service';
import { EventListenerService } from './services/event-listener.service';
import { EventProcessorService } from './services/event-processor.service';

import { Blockchain } from './entities/blockchain.entity';
import { EventEntity } from './entities/event.entity';
import { ContractEntity } from './entities/contract.entity';
import { StarknetContractService } from './services/starknet-contract.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Blockchain,
      EventEntity,
      ContractEntity,
    ]),
  ],
  controllers: [
    BlockchainController,
  ],
  providers: [
    BlockchainService,
    ContractService,

    StarknetService,StarknetContractService,
    EventListenerService,
    EventProcessorService,
  ],
  exports: [
    ContractService, StarknetContractService,

    StarknetService,
    EventListenerService,
    EventProcessorService,
  ],
})
export class BlockchainModule {}
