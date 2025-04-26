import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../entities/event.entity';
import { ContractEntity } from '../entities/contract.entity';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);

  constructor(
    @InjectRepository(EventEntity)
    private eventRepository: Repository<EventEntity>,
    @InjectRepository(ContractEntity)
    private contractRepository: Repository<ContractEntity>,
  ) {}

  @OnEvent('contract.event')
  async processContractEvent(payload: {
    eventId: string;
    contractAddress: string;
    eventName: string;
    blockNumber: number;
  }) {
    try {
      this.logger.debug(`Processing event: ${payload.eventName} from contract ${payload.contractAddress}`);
      
      // Retrieve the full event
      const event = await this.eventRepository.findOne({ 
        where: { id: payload.eventId },
        relations: ['contract'],
      });
      
      if (!event) {
        this.logger.warn(`Event with ID ${payload.eventId} not found`);
        return;
      }
      
      // Here you would add your custom event processing logic
      // This could include:
      // - Triggering notifications
      // - Updating application state
      // - Executing business logic based on event type
      // - Integrating with external services
      
      // Different event types might require different processing
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
        default:
          await this.processGenericEvent(event);
      }
      
      // Mark event as processed
      await this.eventRepository.update(event.id, { isProcessed: true });
      
      this.logger.debug(`Successfully processed event ${event.id}`);
    } catch (error) {
      this.logger.error(`Failed to process event ${payload.eventId}: ${error.message}`);
      // You might want to implement retry logic here
    }
  }
  
  private async processTransferEvent(event: EventEntity): Promise<void> {
    // Example implementation for Transfer events
    this.logger.debug(`Processing Transfer event: ${event.id}`);
    
    // Parse event data
    const eventData = event.data;
    
    // Example: Add application-specific logic here
    // This could include updating token balances, user portfolios, etc.
    
    // You could emit another event for other services to react to
    // this.eventEmitter.emit('token.transfer', { ... });
  }
  
  private async processApprovalEvent(event: EventEntity): Promise<void> {
    // Example implementation for Approval events
    this.logger.debug(`Processing Approval event: ${event.id}`);
    
    // Parse event data and execute business logic
  }
  
  private async processTradeEvent(event: EventEntity): Promise<void> {
    // Example implementation for Trade events
    this.logger.debug(`Processing Trade event: ${event.id}`);
    
    // Parse event data and execute business logic
  }
  
  private async processGenericEvent(event: EventEntity): Promise<void> {
    // Generic event processing for unknown event types
    this.logger.debug(`Processing generic event: ${event.id}`);
    
    // Basic processing for any event type
  }
  
  async processUnprocessedEvents(limit: number = 50): Promise<number> {
    try {
      // Find unprocessed events
      const unprocessedEvents = await this.eventRepository.find({
        where: { isProcessed: false },
        take: limit,
        order: { blockNumber: 'ASC', sequence: 'ASC' },
      });
      
      if (unprocessedEvents.length === 0) {
        return 0;
      }
      
      // Process each event
      for (const event of unprocessedEvents) {
        const contract = await this.contractRepository.findOne({
          where: { id: event.contractId }
        });
        
        if (!contract) {
          this.logger.warn(`Contract with ID ${event.contractId} not found`);
          continue;
        }
        
        await this.processContractEvent({
          eventId: event.id,
          contractAddress: contract.address,
          eventName: event.name,
          blockNumber: event.blockNumber,
        });
      }
      
      return unprocessedEvents.length;
    } catch (error) {
      this.logger.error(`Error processing unprocessed events: ${error.message}`);
      throw error;
    }
  }
} 