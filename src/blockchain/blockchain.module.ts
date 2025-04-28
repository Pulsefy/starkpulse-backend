import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { StarknetService } from './services/starknet.service';
import { EventListenerService } from './services/event-listener.service';
import { EventProcessorService } from './services/event-processor.service';
import { EventController } from './events/event.controller';
import { Blockchain } from './entities/blockchain.entity';
import { EventController } from './events/event.controller';

import { Blockchain } from './entities/blockchain.entity';
import { EventEntity } from './entities/event.entity';
import { ContractEntity } from './entities/contract.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Blockchain,
      Blockchain, EventEntity,
      ContractEntity
    ]),
  ],
  controllers: [
    BlockchainController,
    EventController,
  ],
  providers: [
    BlockchainService,
    StarknetService,
    EventListenerService,
    EventProcessorService,
  ],
  exports: [
    StarknetService,
    EventListenerService,
    EventProcessorService,
  ],
})
export class BlockchainModule {}
