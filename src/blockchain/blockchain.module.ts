import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { StarknetService } from './services/starknet.service';
import { EventListenerService } from './services/event-listener.service';
import { EventProcessorService } from './services/event-processor.service';
import { EventEntity } from './entities/event.entity';
import { ContractEntity } from './entities/contract.entity';
import { EventController } from './events/event.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EventEntity, ContractEntity]),
  ],
  controllers: [EventController],
  providers: [
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