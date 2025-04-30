/* eslint-disable prettier/prettier */
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
  } from '@nestjs/common';
  import { ContractsService } from './contracts.service';
  import { CreateContractDto } from './dto/create-contract.dto';
  import { UpdateContractDto } from './dto/update-contract.dto';
  import { ContractFilterDto } from './dto/contract-filter.dto';
  
  @Controller('contracts')
  export class ContractsController {
    constructor(private readonly svc: ContractsService) {}
  
    @Post()
    create(@Body() dto: CreateContractDto) {
      return this.svc.create(dto);
    }
  
    @Get()
    findAll(@Query() filter: ContractFilterDto) {
      return this.svc.findAll(filter);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.svc.findOne(id);
    }
  
    @Patch(':id')
    update(
      @Param('id') id: string,
      @Body() dto: UpdateContractDto,
    ) {
      return this.svc.update(id, dto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.svc.remove(id);
    }
  
    // --- on-chain endpoints ---
    @Post(':id/call')
    async callMethod(
      @Param('id') id: string,
      @Body('method') method: string,
      @Body('args') args: any[],
    ): Promise<any> {
      const contract = await this.svc.findOne(id);
      if (!contract) {
        throw new Error('Contract not found');
      }
      const { address, name: abiName } = contract;
      if (typeof address !== 'string' || typeof abiName !== 'string' || typeof method !== 'string') {
        throw new Error('Invalid input types');
      }
      if (!Array.isArray(args)) {
        throw new Error('Args must be an array');
      }
      return this.svc.callOnChain(address, abiName, method, args);
    }
  
    @Post(':id/execute')
    async executeMethod(
      @Param('id') id: string,
      @Body('method') method: string,
      @Body('args') args: any[],
    ): Promise<unknown> {
      const contract = await this.svc.findOne(id);
      if (!contract) {
        throw new Error('Contract not found');
      }
      const { address, name: abiName } = contract;
      if (typeof address !== 'string' || typeof abiName !== 'string' || typeof method !== 'string') {
        throw new Error('Invalid input types');
      }
      try {
        const rawResult = await this.svc.executeOnChain(address, abiName, method, args);
        if (rawResult instanceof Error) {
          throw new Error(`Execution failed: ${rawResult.message}`);
        }
        const executionResult: unknown = rawResult; // Ensure rawResult is properly typed
        return executionResult;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to execute on-chain method: ${errorMessage}`);
      }
    }
  }
  