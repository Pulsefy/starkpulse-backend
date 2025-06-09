import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { StarknetService } from './starknet.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractEntity } from '../entities/contract.entity';
import { EventEntity } from '../entities/event.entity';
import { StarknetEmittedEvent } from '../interfaces/starknet-event.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private pollingInterval: NodeJS.Timeout | undefined;
  private isPolling = false;

  constructor(
    private configService: ConfigService,
    private starknetService: StarknetService,
    @InjectRepository(ContractEntity)
    private contractRepository: Repository<ContractEntity>,
    @InjectRepository(EventEntity)
    private eventRepository: Repository<EventEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const { pollingIntervalMs } = this.configService.starknetConfig;
    this.startPolling(pollingIntervalMs);
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  startPolling(intervalMs: number) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (!this.isPolling) {
        this.isPolling = true;
        try {
          await this.pollForEvents();
        } catch (error) {
          this.logger.error(`Error while polling for events: ${error.message}`);
        } finally {
          this.isPolling = false;
        }
      }
    }, intervalMs);

    this.logger.log(`Event polling started with interval: ${intervalMs}ms`);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      this.logger.log('Event polling stopped');
    }
  }

  private async pollForEvents() {
    try {
      const activeContracts = await this.contractRepository.find({
        where: { isActive: true },
      });

      if (activeContracts.length === 0) return;

      const latestBlockNumber = await this.starknetService.getLatestBlockNumber();

      await Promise.all(
        activeContracts.map((contract) =>
          this.processContractEvents(contract, latestBlockNumber),
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to poll for events: ${error.message}`);
      throw error;
    }
  }

  private async processContractEvents(contract: ContractEntity, latestBlockNumber: number) {
    try {
      let fromBlock = contract.lastSyncedBlock
        ? contract.lastSyncedBlock + 1
        : Math.max(0, latestBlockNumber - 100);

      if (fromBlock > latestBlockNumber) return;

      const batchSize = 50;
      const batchSaves: Promise<void>[] = [];

      while (fromBlock <= latestBlockNumber) {
        const toBlock = Math.min(fromBlock + batchSize - 1, latestBlockNumber);
        this.logger.debug(
          `Processing contract ${contract.address} from block ${fromBlock} to ${toBlock}`,
        );

        const events = await this.starknetService.getEvents({
          contractAddresses: [contract.address],
          fromBlock,
          toBlock,
        });

        const filtered = contract.monitoredEvents?.length
          ? events.filter((event) => {
              const name = this.parseEventName(event);
              return name && contract.monitoredEvents.includes(name);
            })
          : events;

        if (filtered.length > 0) {
          batchSaves.push(this.saveEvents(contract, filtered));
        }

        fromBlock = toBlock + 1;
      }

      await Promise.all(batchSaves);

      await this.contractRepository.update(contract.id, {
        lastSyncedBlock: latestBlockNumber,
      });
    } catch (error) {
      this.logger.error(
        `Failed to process events for contract ${contract.address}: ${error.message}`,
      );
      throw error;
    }
  }

  private parseEventName(event: StarknetEmittedEvent): string | null {
    try {
      if (event.keys && event.keys.length > 0) {
        return event.name || 'UnknownEvent';
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to parse event name: ${error.message}`);
      return null;
    }
  }

  private async saveEvents(contract: ContractEntity, events: StarknetEmittedEvent[]) {
    const entities = events.map((event) => {
      const eventName = this.parseEventName(event) || 'UnknownEvent';
      return this.eventRepository.create({
        name: eventName,
        contractId: contract.id,
        data: {
          keys: event.keys,
          data: event.data,
        },
        blockNumber: event.block_number,
        blockHash: event.block_hash,
        transactionHash: event.transaction_hash,
        isProcessed: false,
      });
    });

    await this.eventRepository.save(entities);

    for (const e of entities) {
      this.eventEmitter.emit('contract.event', {
        eventId: e.id,
        contractAddress: contract.address,
        eventName: e.name,
        blockNumber: e.blockNumber,
      });
    }
  }

  async manualSync(contractId: string, fromBlock?: number) {
    try {
      const contract = await this.contractRepository.findOne({
        where: { id: contractId },
      });

      if (!contract) {
        throw new Error(`Contract with ID ${contractId} not found`);
      }

      const latestBlockNumber = await this.starknetService.getLatestBlockNumber();
      await this.processContractEvents(contract, latestBlockNumber);

      return { success: true, message: 'Manual sync completed successfully' };
    } catch (error) {
      this.logger.error(`Manual sync failed: ${error.message}`);
      throw error;
    }
  }
}
