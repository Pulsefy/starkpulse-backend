import { Controller, Get, Post, Body, Param, Query, Delete, Put, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ContractEntity } from '../entities/contract.entity';
import { EventEntity } from '../entities/event.entity';
import { EventListenerService } from '../services/event-listener.service';
import { EventProcessorService } from '../services/event-processor.service';
import { CreateContractDto, UpdateContractDto, ContractFilterDto } from '../dto/contract.dto';
import { EventFilterDto } from '../dto/event.dto';

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
  ) {}

  // Contract Management Endpoints
  
  @Post('contracts')
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

  @Get('contracts')
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

  @Get('contracts/:id')
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

  @Put('contracts/:id')
  async updateContract(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    try {
      await this.contractRepository.update(id, updateContractDto);
      return this.getContract(id);
    } catch (error) {
      this.logger.error(`Failed to update contract: ${error.message}`);
      throw error;
    }
  }

  @Delete('contracts/:id')
  async deleteContract(@Param('id') id: string) {
    try {
      const result = await this.contractRepository.delete(id);
      return { success: result.affected > 0 };
    } catch (error) {
      this.logger.error(`Failed to delete contract: ${error.message}`);
      throw error;
    }
  }

  // Event Management Endpoints
  
  @Get('list')
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
          ...where.blockNumber as object,
          $lte: filterDto.toBlockNumber 
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

  @Get(':id')
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

  // Event Monitoring Control
  
  @Post('contracts/:id/sync')
  async syncContract(@Param('id') id: string) {
    try {
      return await this.eventListenerService.manualSync(id);
    } catch (error) {
      this.logger.error(`Failed to sync contract: ${error.message}`);
      throw error;
    }
  }

  @Post('process-pending')
  async processPendingEvents() {
    try {
      const processedCount = await this.eventProcessorService.processUnprocessedEvents();
      return {
        success: true,
        processedCount,
      };
    } catch (error) {
      this.logger.error(`Failed to process pending events: ${error.message}`);
      throw error;
    }
  }
}