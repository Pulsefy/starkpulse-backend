import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Put,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ContractEntity } from '../entities/contract.entity';
import { EventEntity } from '../entities/event.entity';
import { EventListenerService } from '../services/event-listener.service';
import { EventProcessorService } from '../services/event-processor.service';
import { MetricsService } from '../metrics/metrics.service';

import {
  CreateContractDto,
  UpdateContractDto,
  ContractFilterDto,
} from '../dto/contract.dto';
import { EventFilterDto } from '../dto/event.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Blockchain Events')
@ApiBearerAuth()
@Controller('blockchain/events')
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(
    @InjectRepository(ContractEntity)
    private contractRepository: Repository<ContractEntity>,
    @InjectRepository(EventEntity)
    private eventRepository: Repository<EventEntity>,
    private eventListenerService: EventListenerService,
    private eventProcessorService: EventProcessorService,
    private metrics: MetricsService,
  ) {}

  /**
   * Create a new contract to monitor
   */
  @Post('contracts')
  @ApiOperation({ summary: 'Register a new contract for monitoring', description: 'Registers a new smart contract to be monitored for events.' })
  @ApiBody({
    description: 'Contract creation payload',
    type: CreateContractDto,
    examples: {
      example1: {
        summary: 'ERC-20 contract',
        value: {
          address: '0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a',
          name: 'StarkPulse Token',
          description: 'ERC-20 token for StarkPulse platform',
          monitoredEvents: ['Transfer', 'Approval'],
          isActive: true,
          abi: '[{"name":"Transfer","type":"event"}]',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Contract created', example: { id: 'uuid', address: '0x...', name: 'StarkPulse Token', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' } })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createContract(@Body() createContractDto: CreateContractDto) {
    try {
      const contract = this.contractRepository.create(createContractDto);
      await this.contractRepository.save(contract);
      return contract;
    } catch (error) {
      this.logger.error(`Failed to create contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all monitored contracts (with optional filters)
   */
  @Get('contracts')
  @ApiOperation({ summary: 'Get all monitored contracts', description: 'Returns all registered contracts, optionally filtered by address or status.' })
  @ApiQuery({ name: 'address', required: false, description: 'Filter by contract address' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'List of contracts', example: [{ id: 'uuid', address: '0x...', name: 'StarkPulse Token', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' }] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getContracts(@Query() filterDto: ContractFilterDto) {
    try {
      const where: FindOptionsWhere<ContractEntity> = {};

      if (filterDto.address) {
        where.address = filterDto.address;
      }

      if (filterDto.isActive !== undefined) {
        where.isActive = filterDto.isActive;
      }

      const contracts = await this.contractRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });

      return contracts;
    } catch (error) {
      this.logger.error(`Failed to get contracts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get details of a specific contract
   */
  @Get('contracts/:id')
  @ApiOperation({ summary: 'Get contract details', description: 'Returns details of a specific monitored contract.' })
  @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Contract details', example: { id: 'uuid', address: '0x...', name: 'StarkPulse Token', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' } })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getContract(@Param('id') id: string) {
    try {
      const contract = await this.contractRepository.findOne({
        where: { id },
      });

      if (!contract) {
        throw new Error(`Contract with ID ${id} not found`);
      }

      return contract;
    } catch (error) {
      this.logger.error(`Failed to get contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update contract monitoring settings
   */
  @Put('contracts/:id')
  @ApiOperation({ summary: 'Update contract monitoring settings', description: 'Updates the settings for a monitored contract.' })
  @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
  @ApiBody({
    description: 'Contract update payload',
    type: UpdateContractDto,
    examples: {
      example1: {
        summary: 'Update monitored events',
        value: {
          name: 'StarkPulse ERC20',
          monitoredEvents: ['Transfer', 'Approval', 'UpdatedMetadata'],
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Contract updated', example: { id: 'uuid', address: '0x...', name: 'StarkPulse ERC20', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval', 'UpdatedMetadata'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' } })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateContract(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    try {
      // Convert the DTO to a proper entity partial
      const updateData = {
        ...updateContractDto,
        // If abi is a string, ensure it's properly handled
        abi: updateContractDto.abi
          ? JSON.parse(updateContractDto.abi)
          : undefined,
      };

      await this.contractRepository.update(id, updateData);
      return this.getContract(id);
    } catch (error) {
      this.logger.error(`Failed to update contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a contract from monitoring
   */
  @Delete('contracts/:id')
  @ApiOperation({ summary: 'Delete a contract', description: 'Removes a contract from monitoring.' })
  @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Contract deleted', example: { success: true } })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteContract(@Param('id') id: string) {
    try {
      const result = await this.contractRepository.delete(id);
      return {
        success:
          result.affected !== undefined &&
          result.affected !== null &&
          result.affected > 0,
      };
    } catch (error) {
      this.logger.error(`Failed to delete contract: ${error.message}`);
      throw error;
    }
  }

  // Event Management Endpoints

  /**
   * List contract events with filtering
   */
  @Get('list')
  @ApiOperation({ summary: 'List contract events', description: 'Returns contract events with optional filtering by contract, name, block range, etc.' })
  @ApiQuery({ name: 'contractId', required: false, description: 'Filter by contract ID' })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by event name' })
  @ApiQuery({ name: 'isProcessed', required: false, description: 'Filter by processed status' })
  @ApiQuery({ name: 'fromBlockNumber', required: false, description: 'Start block number' })
  @ApiQuery({ name: 'toBlockNumber', required: false, description: 'End block number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Pagination limit' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiResponse({ status: 200, description: 'List of events with pagination', example: { events: [{ id: 'uuid', name: 'Transfer', contractId: 'uuid', data: { keys: ['0x...'] }, blockNumber: 123, blockHash: '0x...', transactionHash: '0x...', isProcessed: true, createdAt: '2023-08-15T11:45:23.456Z', contract: { id: 'uuid', address: '0x...', name: 'StarkPulse ERC20' } }], pagination: { total: 24, limit: 2, offset: 0 } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getEvents(@Query() filterDto: EventFilterDto) {
    try {
      const where: FindOptionsWhere<EventEntity> = {};

      if (filterDto.contractId) {
        where.contractId = filterDto.contractId;
      }

      if (filterDto.name) {
        where.name = filterDto.name;
      }

      if (filterDto.isProcessed !== undefined) {
        where.isProcessed = filterDto.isProcessed;
      }

      if (filterDto.fromBlockNumber) {
        where.blockNumber = { $gte: filterDto.fromBlockNumber } as any;
      }

      if (filterDto.toBlockNumber) {
        where.blockNumber = {
          ...(where.blockNumber as object),
          $lte: filterDto.toBlockNumber,
        } as any;
      }

      const limit = filterDto.limit || 50;
      const offset = filterDto.offset || 0;

      const events = await this.eventRepository.find({
        where,
        take: limit,
        skip: offset,
        order: { blockNumber: 'DESC', createdAt: 'DESC' },
        relations: ['contract'],
      });

      const total = await this.eventRepository.count({ where });

      return {
        events,
        pagination: {
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get events: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get details of a specific event
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get event details', description: 'Returns details of a specific contract event.' })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Event details', example: { id: 'uuid', name: 'Transfer', contractId: 'uuid', data: { keys: ['0x...'] }, blockNumber: 123, blockHash: '0x...', transactionHash: '0x...', isProcessed: true, createdAt: '2023-08-15T11:45:23.456Z', contract: { id: 'uuid', address: '0x...', name: 'StarkPulse ERC20' } } })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getEvent(@Param('id') id: string) {
    try {
      const event = await this.eventRepository.findOne({
        where: { id },
        relations: ['contract'],
      });

      if (!event) {
        throw new Error(`Event with ID ${id} not found`);
      }

      return event;
    } catch (error) {
      this.logger.error(`Failed to get event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Manually sync events for a contract
   */
  @Post('contracts/:id/sync')
  @ApiOperation({ summary: 'Manually sync contract events', description: 'Triggers a manual sync of events for a specific contract.' })
  @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Sync completed', example: { success: true, message: 'Manual sync completed successfully' } })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async syncContract(@Param('id') id: string) {
    try {
      return await this.eventListenerService.manualSync(id);
    } catch (error) {
      this.logger.error(`Failed to sync contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process all pending events
   */
  @Post('process-pending')
  @ApiOperation({ summary: 'Process pending events', description: 'Processes all unprocessed contract events.' })
  @ApiResponse({ status: 200, description: 'Processing completed', example: { success: true, processedCount: 15 } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async processPendingEvents() {
    try {
      const processedCount =
        await this.eventProcessorService.processUnprocessedEvents();
      return {
        success: true,
        processedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to process pending events: ${error.message}`);
      throw error;
    }
  }

  @Get('metrics')
  getMetrics() {
    return this.metrics.getCurrentStats();
  }
}
