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
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
  
  @ApiTags('Contracts')
  @ApiBearerAuth()
  @Controller('contracts')
  export class ContractsController {
    constructor(private readonly svc: ContractsService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new contract', description: 'Registers a new contract for on-chain monitoring.' })
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
    @ApiResponse({ status: 201, description: 'Contract created', example: { id: 'uuid', address: '0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a', name: 'StarkPulse Token', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' } })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    create(@Body() dto: CreateContractDto) {
      return this.svc.create(dto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all contracts', description: 'Returns all registered contracts, optionally filtered.' })
    @ApiQuery({ name: 'address', required: false, description: 'Filter by contract address' })
    @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
    @ApiResponse({ status: 200, description: 'List of contracts', example: [{ id: 'uuid', address: '0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a', name: 'StarkPulse Token', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' }] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findAll(@Query() filter: ContractFilterDto) {
      return this.svc.findAll(filter);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get contract details', description: 'Returns details of a specific contract.' })
    @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Contract details', example: { id: 'uuid', address: '0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a', name: 'StarkPulse Token', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' } })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    findOne(@Param('id') id: string) {
      return this.svc.findOne(id);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update contract', description: 'Updates a contract.' })
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
    @ApiResponse({ status: 200, description: 'Contract updated', example: { id: 'uuid', address: '0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a', name: 'StarkPulse ERC20', description: 'ERC-20 token for StarkPulse platform', monitoredEvents: ['Transfer', 'Approval', 'UpdatedMetadata'], isActive: true, abi: [{ name: 'Transfer', type: 'event' }], createdAt: '2023-08-15T10:23:45.123Z', updatedAt: '2023-08-15T10:23:45.123Z' } })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    update(
      @Param('id') id: string,
      @Body() dto: UpdateContractDto,
    ) {
      return this.svc.update(id, dto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a contract', description: 'Removes a contract.' })
    @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
    @ApiResponse({ status: 200, description: 'Contract deleted', example: { success: true } })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
    remove(@Param('id') id: string) {
      return this.svc.remove(id);
    }
  
    // --- on-chain endpoints ---
    @Post(':id/call')
    @ApiOperation({ summary: 'Call on-chain method', description: 'Calls a read-only method on the contract.' })
    @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
    @ApiBody({
      description: 'Method call payload',
      schema: {
        example: {
          method: 'balanceOf',
          args: ['0x123...'],
        },
      },
    })
    @ApiResponse({ status: 200, description: 'Method call result', example: { result: 1000 } })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
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
    @ApiOperation({ summary: 'Execute on-chain method', description: 'Executes a state-changing method on the contract.' })
    @ApiParam({ name: 'id', description: 'Contract ID (UUID)' })
    @ApiBody({
      description: 'Method execution payload',
      schema: {
        example: {
          method: 'transfer',
          args: ['0xabc...', 100],
        },
      },
    })
    @ApiResponse({ status: 200, description: 'Execution result', example: { txHash: '0x...', status: 'success' } })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'Internal server error' })
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
