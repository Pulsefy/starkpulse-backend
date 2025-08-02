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
import { EventController } from './events/event.controller';
import { Blockchain } from './entities/blockchain.entity';

import { EventEntity } from './entities/event.entity';
import { ContractEntity } from './entities/contract.entity';
import { StarknetContractService } from './services/starknet-contract.service';
import { EthereumAdapterService } from './services/ethereum-adapter.service';
import { BitcoinAdapterService } from './services/bitcoin-adapter.service';
import { PolygonAdapterService } from './services/polygon-adapter.service';
import { BSCAdapterService } from './services/bsc-adapter.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Blockchain,
      EventEntity,
      ContractEntity,
    ]),
  ],
  controllers: [BlockchainController, EventController],
  providers: [
    BlockchainService,
    ContractService,
    StarknetService,StarknetContractService,
    EventListenerService,
    EventProcessorService,
    EthereumAdapterService,
    BitcoinAdapterService,
    PolygonAdapterService,
    BSCAdapterService,
  ],
  exports: [
    ContractService, StarknetContractService,
    StarknetService,
    EventListenerService,
    EventProcessorService,
    EthereumAdapterService,
    BitcoinAdapterService,
    PolygonAdapterService,
    BSCAdapterService,
  ],
})
export class BlockchainModule {}
