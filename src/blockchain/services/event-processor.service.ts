import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EventEntity } from '../entities/event.entity';
import { ContractEntity } from '../entities/contract.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from '../metrics/metrics.service';


@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);
  private readonly MAX_RETRY_COUNT = 3;

  constructor(
    @InjectRepository(EventEntity)
    private eventRepository: Repository<EventEntity>,
    @InjectRepository(ContractEntity)
    private contractRepository: Repository<ContractEntity>,
    private eventEmitter: EventEmitter2,
    private readonly metrics: MetricsService,

  ) {}

  @OnEvent('contract.event')
  async processContractEvent(payload: {
    eventId: string;
    contractAddress: string;
    eventName: string;
    blockNumber: number;
  }) {
    try {
      this.logger.debug(
        `Processing event: ${payload.eventName} from contract ${payload.contractAddress}`,
      );

      // Retrieve the full event
      const event = await this.eventRepository.findOne({
        where: { id: payload.eventId },
        relations: ['contract'],
      });

      if (!event) {
        this.logger.warn(`Event with ID ${payload.eventId} not found`);
        return;
      }

      // Different event types require different processing
      switch (event.name) {
        case 'Transfer':
          await this.processTransferEvent(event);
          break;
        case 'Approval':
          await this.processApprovalEvent(event);
          break;
        case 'Trade':
          await this.processTradeEvent(event);
          break;
        case 'Deposit':
          await this.processDepositEvent(event);
          break;
        case 'Withdrawal':
          await this.processWithdrawalEvent(event);
          break;
        case 'Swap':
          await this.processSwapEvent(event);
          break;
        case 'LiquidityAdded':
          await this.processLiquidityAddedEvent(event);
          break;
        case 'LiquidityRemoved':
          await this.processLiquidityRemovedEvent(event);
          break;
        default:
          await this.processGenericEvent(event);
      }

      // Mark event as processed
      await this.eventRepository.update(event.id, {
        isProcessed: true,
      });

      // Emit an event that processing is complete
      this.eventEmitter.emit('event.processed', {
        eventId: event.id,
        contractAddress: payload.contractAddress,
        eventName: event.name,
        success: true,
      });

      this.logger.debug(`Successfully processed event ${event.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to process event ${payload.eventId}: ${error.message}`,
      );

      // Fetch the event to check retry count
      const event = await this.eventRepository.findOne({
        where: { id: payload.eventId },
      });

      if (event) {
        const retryCount = event.data.retryCount || 0;

        if (retryCount < this.MAX_RETRY_COUNT) {
          // Update retry count and schedule for retry
          await this.eventRepository.update(event.id, {
            data: {
              ...event.data,
              retryCount: retryCount + 1,
              lastError: error.message,
              lastErrorTime: new Date().toISOString(),
            },
          });

          // Emit an event for retry
          setTimeout(
            () => {
              this.eventEmitter.emit('contract.event.retry', payload);
            },
            Math.pow(2, retryCount) * 1000,
          ); // Exponential backoff

          this.logger.debug(
            `Scheduled retry ${retryCount + 1}/${this.MAX_RETRY_COUNT} for event ${payload.eventId}`,
          );
        } else {
          // Mark as failed after max retries
          await this.eventRepository.update(event.id, {
            data: {
              ...event.data,
              processingFailed: true,
              lastError: error.message,
              lastErrorTime: new Date().toISOString(),
            },
          });

          // Emit a failure event
          this.eventEmitter.emit('event.processing.failed', {
            eventId: event.id,
            contractAddress: payload.contractAddress,
            eventName: event.name,
            error: error.message,
          });

          this.logger.warn(
            `Event ${payload.eventId} failed processing after ${this.MAX_RETRY_COUNT} retries`,
          );
        }
      }
    }
  }

  @OnEvent('contract.event.retry')
  async retryProcessContractEvent(payload: {
    eventId: string;
    contractAddress: string;
    eventName: string;
    blockNumber: number;
  }) {
    this.logger.debug(`Retrying event processing for ${payload.eventId}`);
    await this.processContractEvent(payload);
  }

  private async processTransferEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing Transfer event: ${event.id}`);

    try {
      // Extract relevant data from the event
      const eventData = event.data;
      const keys = eventData.keys || [];
      const data = eventData.data || [];

      // For ERC-20 Transfer events, typically:
      // keys[0] = event selector
      // keys[1] = from address
      // keys[2] = to address
      // data[0] = amount (as felt)

      if (keys.length >= 3 && data.length >= 1) {
        const from = keys[1];
        const to = keys[2];
        const amount = data[0];

        this.logger.debug(`Transfer: ${from} -> ${to}, Amount: ${amount}`);

        // Here you would implement business logic like:
        // 1. Update user balances
        // 2. Track token movements
        // 3. Update portfolio analytics
        // 4. Trigger notifications

        // Example: Emit event for notification service
        this.eventEmitter.emit('notification.transfer', {
          eventId: event.id,
          contractId: event.contractId,
          from,
          to,
          amount,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error('Invalid Transfer event data format');
      }
    } catch (error) {
      this.logger.error(`Error processing Transfer event: ${error.message}`);
      throw error;
    }
  }

  private async processApprovalEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing Approval event: ${event.id}`);

    try {
      // Extract relevant data from the event
      const eventData = event.data;
      const keys = eventData.keys || [];
      const data = eventData.data || [];

      // For ERC-20 Approval events, typically:
      // keys[0] = event selector
      // keys[1] = owner address
      // keys[2] = spender address
      // data[0] = amount (as felt)

      if (keys.length >= 3 && data.length >= 1) {
        const owner = keys[1];
        const spender = keys[2];
        const amount = data[0];

        this.logger.debug(
          `Approval: ${owner} approved ${spender} to spend ${amount}`,
        );

        // Business logic for approvals
        // Example: Track approvals for security monitoring
        this.eventEmitter.emit('security.approval', {
          eventId: event.id,
          contractId: event.contractId,
          owner,
          spender,
          amount,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error('Invalid Approval event data format');
      }
    } catch (error) {
      this.logger.error(`Error processing Approval event: ${error.message}`);
      throw error;
    }
  }

  private async processTradeEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing Trade event: ${event.id}`);

    try {
      // Extract relevant data
      const eventData = event.data;

      // Business logic for trade events
      // Example: Update market data, trading volumes, price charts

      // Emit event for market data service
      this.eventEmitter.emit('market.trade', {
        eventId: event.id,
        contractId: event.contractId,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error processing Trade event: ${error.message}`);
      throw error;
    }
  }

  private async processDepositEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing Deposit event: ${event.id}`);

    try {
      // Extract and process deposit data
      const eventData = event.data;

      // Business logic for deposits
      // Example: Update user balances, track protocol TVL

      this.eventEmitter.emit('finance.deposit', {
        eventId: event.id,
        contractId: event.contractId,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error processing Deposit event: ${error.message}`);
      throw error;
    }
  }

  private async processWithdrawalEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing Withdrawal event: ${event.id}`);

    try {
      // Extract and process withdrawal data
      const eventData = event.data;

      // Business logic for withdrawals

      this.eventEmitter.emit('finance.withdrawal', {
        eventId: event.id,
        contractId: event.contractId,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error processing Withdrawal event: ${error.message}`);
      throw error;
    }
  }

  private async processSwapEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing Swap event: ${event.id}`);

    try {
      // Extract swap details
      const eventData = event.data;

      // Business logic for swaps
      // Example: Track DEX volumes, update price impact metrics

      this.eventEmitter.emit('dex.swap', {
        eventId: event.id,
        contractId: event.contractId,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error processing Swap event: ${error.message}`);
      throw error;
    }
  }

  private async processLiquidityAddedEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing LiquidityAdded event: ${event.id}`);

    try {
      // Extract liquidity provision details
      const eventData = event.data;

      // Business logic for liquidity additions
      // Example: Update pool metrics, track LP positions

      this.eventEmitter.emit('dex.liquidity.added', {
        eventId: event.id,
        contractId: event.contractId,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error processing LiquidityAdded event: ${error.message}`,
      );
      throw error;
    }
  }

  private async processLiquidityRemovedEvent(
    event: EventEntity,
  ): Promise<void> {
    this.logger.debug(`Processing LiquidityRemoved event: ${event.id}`);

    try {
      // Extract liquidity removal details
      const eventData = event.data;

      // Business logic for liquidity removals

      this.eventEmitter.emit('dex.liquidity.removed', {
        eventId: event.id,
        contractId: event.contractId,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error processing LiquidityRemoved event: ${error.message}`,
      );
      throw error;
    }
  }

  private async processGenericEvent(event: EventEntity): Promise<void> {
    this.logger.debug(`Processing generic event: ${event.id} (${event.name})`);

    try {
      // Basic processing for unknown event types
      const eventData = event.data;

      // Emit a generic event for subscribers
      this.eventEmitter.emit('blockchain.event.generic', {
        eventId: event.id,
        contractId: event.contractId,
        eventName: event.name,
        data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error processing generic event: ${error.message}`);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processUnprocessedEvents(limit: number = 50): Promise<number> {
    try {
      this.logger.debug(`Checking for unprocessed events (limit: ${limit})`);

      // Find unprocessed events
      const unprocessedEvents = await this.eventRepository.find({
        where: { isProcessed: false },
        take: limit,
        order: { blockNumber: 'ASC', sequence: 'ASC' },
        relations: ['contract'],
      });

      if (unprocessedEvents.length === 0) {
        return 0;
      }

      this.logger.debug(`Found ${unprocessedEvents.length} unprocessed events`);

      // Process each event
      for (const event of unprocessedEvents) {
        if (!event.contract) {
          this.logger.warn(
            `Contract not loaded for event ${event.id}, attempting to load`,
          );

          const contract = await this.contractRepository.findOne({
            where: { id: event.contractId },
          });

          if (!contract) {
            this.logger.warn(`Contract with ID ${event.contractId} not found`);
            continue;
          }

          event.contract = contract;
        }

        await this.processContractEvent({
          eventId: event.id,
          contractAddress: event.contract.address,
          eventName: event.name,
          blockNumber: event.blockNumber,
        });
      }

      return unprocessedEvents.length;
    } catch (error) {
      this.logger.error(
        `Error processing unprocessed events: ${error.message}`,
      );
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedEvents(): Promise<void> {
    try {
      // Find all events that are marked as failed
      const failedEvents = await this.eventRepository.find({
        where: {
          data: { processingFailed: true },
        } as any,
        take: 100, // Limit to avoid overloading the system
      });

      if (failedEvents.length === 0) {
        return;
      }

      this.logger.debug(
        `Found ${failedEvents.length} failed events to clean up`,
      );

      // You could implement various cleanup strategies:
      // 1. Move to a separate archive table
      // 2. Send to a dead letter queue
      // 3. Alert administrators
      // 4. Attempt a final retry with different parameters

      for (const event of failedEvents) {
        // Example: Log to a dedicated monitoring system
        this.eventEmitter.emit('monitoring.failed_event', {
          eventId: event.id,
          contractId: event.contractId,
          eventName: event.name,
          error: event.data.lastError,
          attempts: event.data.retryCount,
          timestamp: event.data.lastErrorTime,
        });
      }

      this.logger.debug(`Completed failed events cleanup process`);
    } catch (error) {
      this.logger.error(`Error in failed events cleanup: ${error.message}`);
    }
  }

  // Get metrics for events processing
  async getProcessingMetrics(timespan: string = 'day'): Promise<any> {
    try {
      // This would typically create metrics like:
      // - Events processed per minute/hour/day
      // - Failure rate
      // - Processing time
      // - Events by contract
      // - Events by type

      // Example implementation - actual SQL would depend on database capabilities
      const startDate = new Date();
      if (timespan === 'hour') {
        startDate.setHours(startDate.getHours() - 1);
      } else if (timespan === 'day') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (timespan === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      }

      // Count total events in timespan
      const totalEvents = await this.eventRepository.count({
        where: {
          createdAt: MoreThan(startDate),
        },
      });

      // Count processed events
      const processedEvents = await this.eventRepository.count({
        where: {
          createdAt: MoreThan(startDate),
          isProcessed: true,
        },
      });

      // Get event distribution by type (using raw SQL for better performance)
      // You would implement this according to your specific database

      return {
        timespan,
        totalEvents,
        processedEvents,
        processingRate:
          totalEvents > 0 ? (processedEvents / totalEvents) * 100 : 100,
        // Additional metrics would be added here
      };
    } catch (error) {
      this.logger.error(`Error getting processing metrics: ${error.message}`);
      throw error;
    }
  }

   private isRelevantEvent(event: any): boolean {
    const allowedTypes = ['Transfer', 'Swap'];
    return allowedTypes.includes(event.name);
  }

  async processBatch(events: any[]) {
    const filtered = events.filter(this.isRelevantEvent);

    const inserts = filtered.map(event => ({
      tx_hash: event.txHash,
      type: event.name,
      block_number: event.blockNumber,
      data: JSON.stringify(event.data),
      created_at: new Date(),
    }));

    if (inserts.length > 0) {
      await this.eventRepo
        .createQueryBuilder()
        .insert()
        .into(EventEntity)
        .values(inserts)
        .orIgnore()
        .execute();

      this.logger.log(`Inserted ${inserts.length} events.`);
      this.metrics.incrementProcessed(inserts.length);
    }
  }
}
