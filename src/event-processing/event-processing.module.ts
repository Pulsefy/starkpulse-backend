import { MonitoringModule } from "../monitoring/monitoring.module";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { EventQueueService } from "./event-queue/event-queue.service";
import { MonitoringService } from "../monitoring/monitoring.service";
import { APP_FILTER } from "@nestjs/core";
import { EventProcessingErrorFilter } from "./event-error.filter";
import { EventReplayService } from "./event-replay/event-repay.service";

@Module({
    imports: [
      BullModule.registerQueue(
        { name: 'event-queue' },
        { name: 'dead-letter-queue' }
      ),
      BlockchainModule,
      MonitoringModule,
    ],
    providers: [
      EventQueueService,
      EventReplayService,
      MonitoringService,
      {
        provide: APP_FILTER,
        useClass: EventProcessingErrorFilter,
      },
    ],
    exports: [EventReplayService, MonitoringService],
  })
  export class EventProcessingModule {}