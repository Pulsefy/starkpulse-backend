import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { MonitoringService } from '../event-monitoring/monitoring.service';
import { BlockchainEvent } from '../../common/interfaces/BlockchainEvent';
import { Inject } from '@nestjs/common';

@Processor('event-queue')
export class EventQueueService {
  constructor(
    @InjectQueue('dead-letter-queue') private deadLetterQueue: Queue,
    @Inject()
    private readonly monitoringService: MonitoringService
  ) {}

  @Process()
  async processEvent(job: Job<BlockchainEvent>) {
    try {
      // Process event with retry logic
      await this.handleEventWithRetry(job.data);
    } catch (error) {
      await this.deadLetterQueue.add(job.data);
      this.monitoringService.trackFailedEvent(job.id, error);
    }
  }

  private async handleEventWithRetry(event: BlockchainEvent, attempt = 0) {
    try {
      // Your processing logic here
    } catch (error) {
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.handleEventWithRetry(event, attempt + 1);
      }
      throw error;
    }
  }
}