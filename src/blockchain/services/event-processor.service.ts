import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { EventEntity } from '../entities/event.entity';
import { ContractEntity } from '../entities/contract.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

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
      const event = await this.eventRepository.findOne({
        where: { id: payload.eventId },
        relations: ['contract'],
      });
      if (!event) {
        this.logger.warn(`Event with ID ${payload.eventId} not found`);
        return;
      }
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
      await this.eventRepository.update(event.id, { isProcessed: true });
      this.eventEmitter.emit('event.processed', {
        eventId: event.id,
        contractAddress: payload.contractAddress,
        eventName: event.name,
        success: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process event ${payload.eventId}: ${error.message}`,
      );
      const event = await this.eventRepository.findOne({
        where: { id: payload.eventId },
      });
      if (event) {
        const retryCount = event.data.retryCount || 0;
        if (retryCount < this.MAX_RETRY_COUNT) {
          await this.eventRepository.update(event.id, {
            data: {
              ...event.data,
              retryCount: retryCount + 1,
              lastError: error.message,
              lastErrorTime: new Date().toISOString(),
            },
          });
          setTimeout(
            () => {
              this.eventEmitter.emit('contract.event.retry', payload);
            },
            Math.pow(2, retryCount) * 1000,
          );
        } else {
          await this.eventRepository.update(event.id, {
            data: {
              ...event.data,
              processingFailed: true,
              lastError: error.message,
              lastErrorTime: new Date().toISOString(),
            },
          });
          this.eventEmitter.emit('event.processing.failed', {
            eventId: event.id,
            contractAddress: payload.contractAddress,
            eventName: event.name,
            error: error.message,
          });
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
    await this.processContractEvent(payload);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processUnprocessedEvents(limit: number = 50): Promise<number> {
    const unprocessedEvents = await this.eventRepository.find({
      where: { isProcessed: false },
      take: limit,
      order: { blockNumber: 'ASC', sequence: 'ASC' },
      relations: ['contract'],
    });
    for (const event of unprocessedEvents) {
      if (!event.contract) {
        const contract = await this.contractRepository.findOne({
          where: { id: event.contractId },
        });
        if (!contract) continue;
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
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedEvents(): Promise<void> {
    const failedEvents = await this.eventRepository.find({
      where: { data: { processingFailed: true } } as any,
      take: 100,
    });
    for (const event of failedEvents) {
      this.eventEmitter.emit('monitoring.failed_event', {
        eventId: event.id,
        contractId: event.contractId,
        eventName: event.name,
        error: event.data.lastError,
        attempts: event.data.retryCount,
        timestamp: event.data.lastErrorTime,
      });
    }
  }

  async getProcessingMetrics(timespan: string = 'day'): Promise<any> {
    const startDate = new Date();
    if (timespan === 'hour') startDate.setHours(startDate.getHours() - 1);
    else if (timespan === 'day') startDate.setDate(startDate.getDate() - 1);
    else if (timespan === 'week') startDate.setDate(startDate.getDate() - 7);

    const totalEvents = await this.eventRepository.count({
      where: { createdAt: MoreThan(startDate) },
    });
    const processedEvents = await this.eventRepository.count({
      where: { createdAt: MoreThan(startDate), isProcessed: true },
    });

    return {
      timespan,
      totalEvents,
      processedEvents,
      processingRate:
        totalEvents > 0 ? (processedEvents / totalEvents) * 100 : 100,
    };
  }

  // Add the missing event processing methods:
  private async processTransferEvent(event: any): Promise<void> {
    // Implementation for transfer event processing
    this.logger.log(`Processing Transfer event: ${event.id}`);
    // Add your transfer event logic here
  }

  private async processApprovalEvent(event: any): Promise<void> {
    // Implementation for approval event processing
    this.logger.log(`Processing Approval event: ${event.id}`);
    // Add your approval event logic here
  }

  private async processTradeEvent(event: any): Promise<void> {
    // Implementation for trade event processing
    this.logger.log(`Processing Trade event: ${event.id}`);
    // Add your trade event logic here
  }

  private async processDepositEvent(event: any): Promise<void> {
    // Implementation for deposit event processing
    this.logger.log(`Processing Deposit event: ${event.id}`);
    // Add your deposit event logic here
  }

  private async processWithdrawalEvent(event: any): Promise<void> {
    // Implementation for withdrawal event processing
    this.logger.log(`Processing Withdrawal event: ${event.id}`);
    // Add your withdrawal event logic here
  }

  private async processSwapEvent(event: any): Promise<void> {
    // Implementation for swap event processing
    this.logger.log(`Processing Swap event: ${event.id}`);
    // Add your swap event logic here
  }

  private async processLiquidityAddedEvent(event: any): Promise<void> {
    // Implementation for liquidity added event processing
    this.logger.log(`Processing LiquidityAdded event: ${event.id}`);
    // Add your liquidity added event logic here
  }

  private async processLiquidityRemovedEvent(event: any): Promise<void> {
    // Implementation for liquidity removed event processing
    this.logger.log(`Processing LiquidityRemoved event: ${event.id}`);
    // Add your liquidity removed event logic here
  }

  private async processGenericEvent(event: any): Promise<void> {
    // Implementation for generic event processing
    this.logger.log(`Processing generic event: ${event.id}`);
    // Add your generic event logic here
  }
}
