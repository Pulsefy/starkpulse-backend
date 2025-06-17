import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { StarknetService } from './starknet.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ContractEntity } from '../entities/contract.entity';
import { EventEntity } from '../entities/event.entity';
import { StarknetEmittedEvent } from '../interfaces/starknet-event.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventProcessorService } from './event-processor.service';


const BATCH_SIZE = 100;


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
    private readonly eventProcessor: EventProcessorService,

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
      // Get all active contracts
      const activeContracts = await this.contractRepository.find({
        where: { isActive: true },
      });

      if (activeContracts.length === 0) {
        return;
      }

      // Get latest block number
      const latestBlockNumber =
        await this.starknetService.getLatestBlockNumber();

      // Process each contract
      for (const contract of activeContracts) {
        await this.processContractEvents(contract, latestBlockNumber);
      }
    } catch (error) {
      this.logger.error(`Failed to poll for events: ${error.message}`);
      throw error;
    }
  }

  private async processContractEvents(
    contract: ContractEntity,
    latestBlockNumber: number,
  ) {
    try {
      // Start from last synced block + 1 or default to latest - 100 blocks if never synced
      const fromBlock = contract.lastSyncedBlock
        ? contract.lastSyncedBlock + 1
        : Math.max(0, latestBlockNumber - 100);

      // Don't process if already up to date
      if (fromBlock > latestBlockNumber) {
        return;
      }

      // Limit blocks per fetch to avoid large requests
      const toBlock = Math.min(fromBlock + 50, latestBlockNumber);

      this.logger.debug(
        `Processing events for contract ${contract.address} from block ${fromBlock} to ${toBlock}`,
      );

      // Get events for this contract in the block range
      const events = await this.starknetService.getEvents({
        contractAddresses: [contract.address],
        fromBlock,
        toBlock,
      });

      // Filter events based on monitoredEvents if configured
      const filteredEvents =
        contract.monitoredEvents && contract.monitoredEvents.length > 0
          ? events.filter((event) => {
              // Try to parse event name from keys
              const eventName = this.parseEventName(event);
              return eventName && contract.monitoredEvents.includes(eventName);
            })
          : events;

      if (filteredEvents.length > 0) {
        await this.saveEvents(contract, filteredEvents);
      }

      // Update last synced block for this contract
      await this.contractRepository.update(contract.id, {
        lastSyncedBlock: toBlock,
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
      // In StarkNet, the first key often contains the event name
      // This is a simplified approach - in real-world, you'd use the ABI to decode
      if (event.keys && event.keys.length > 0) {
        // Basic parsing logic - would need more sophisticated approach with real ABIs
        return event.name || 'UnknownEvent';
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to parse event name: ${error.message}`);
      return null;
    }
  }

  private async saveEvents(
    contract: ContractEntity,
    events: StarknetEmittedEvent[],
  ) {
    for (const event of events) {
      try {
        const eventName = this.parseEventName(event) || 'UnknownEvent';

        const eventEntity = this.eventRepository.create({
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

        await this.eventRepository.save(eventEntity);

        // Emit event for further processing
        this.eventEmitter.emit('contract.event', {
          eventId: eventEntity.id,
          contractAddress: contract.address,
          eventName,
          blockNumber: event.block_number,
        });

        this.logger.debug(
          `Saved event ${eventName} for contract ${contract.address} at block ${event.block_number}`,
        );
      } catch (error) {
        this.logger.error(`Failed to save event: ${error.message}`);
      }
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

      const latestBlockNumber =
        await this.starknetService.getLatestBlockNumber();
      await this.processContractEvents(contract, latestBlockNumber);

      return { success: true, message: 'Manual sync completed successfully' };
    } catch (error) {
      this.logger.error(`Manual sync failed: ${error.message}`);
      throw error;
    }
  }

    async pollEvents(fromBlock: number, toBlock: number) {
    const allEvents = await this.starknetService.getEvents({ fromBlock, toBlock });
    this.logger.log(`Fetched ${allEvents.length} events.`);

    for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
      const batch = allEvents.slice(i, i + BATCH_SIZE);
      await this.eventProcessor.processBatch(batch);
    }
  }

}
