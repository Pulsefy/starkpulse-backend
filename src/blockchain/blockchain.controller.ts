/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';
import { CreateBlockchainDto } from './dto/create-blockchain.dto';
import { UpdateBlockchainDto } from './dto/update-blockchain.dto';

@ApiTags('blockchain')
@ApiBearerAuth()
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a blockchain resource',
    description: 'Creates a new blockchain resource.',
  })
  @ApiBody({
    description: 'Blockchain creation payload',
    type: CreateBlockchainDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Resource created',
    schema: { example: { id: 1, name: 'example' } },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  create(@Body() createBlockchainDto: CreateBlockchainDto) {
    return this.blockchainService.create(createBlockchainDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all blockchain resources',
    description: 'Returns all blockchain resources.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of resources',
    schema: { example: [{ id: 1, name: 'example' }] },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll() {
    return this.blockchainService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get blockchain resource by ID',
    description: 'Returns a blockchain resource by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({
    status: 200,
    description: 'Resource details',
    schema: { example: { id: 1, name: 'example' } },
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id') id: string) {
    return this.blockchainService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update blockchain resource',
    description: 'Updates a blockchain resource by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiBody({
    description: 'Blockchain update payload',
    type: UpdateBlockchainDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Resource updated',
    schema: { example: { id: 1, name: 'example' } },
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(
    @Param('id') id: string,
    @Body() updateBlockchainDto: UpdateBlockchainDto,
  ) {
    return this.blockchainService.update(+id, updateBlockchainDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete blockchain resource',
    description: 'Deletes a blockchain resource by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({
    status: 200,
    description: 'Resource deleted',
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id') id: string) {
    return this.blockchainService.remove(+id);
  }

  @Post(':chain/contract/:address/call')
  @ApiOperation({ summary: 'Call a contract method on a specific chain' })
  @ApiParam({ name: 'chain', description: 'Blockchain network (e.g., ethereum, bitcoin, polygon, bsc)' })
  @ApiParam({ name: 'address', description: 'Contract address' })
  @ApiBody({ schema: { example: { abi: [], method: 'balanceOf', args: ['0x...'] } } })
  async callContractMethod(
    @Param('chain') chain: string,
    @Param('address') address: string,
    @Body() body: { abi: any; method: string; args: any[] },
  ) {
    return this.blockchainService.callContractMethod(chain, address, body.abi, body.method, body.args);
  }

  @Post(':chain/contract/:address/execute')
  @ApiOperation({ summary: 'Execute a contract method (transaction) on a specific chain' })
  @ApiParam({ name: 'chain', description: 'Blockchain network' })
  @ApiParam({ name: 'address', description: 'Contract address' })
  @ApiBody({ schema: { example: { abi: [], method: 'transfer', args: ['0x...', '100'] } } })
  async executeContractMethod(
    @Param('chain') chain: string,
    @Param('address') address: string,
    @Body() body: { abi: any; method: string; args: any[] },
  ) {
    return this.blockchainService.executeContractMethod(chain, address, body.abi, body.method, body.args);
  }

  @Post(':chain/contract/:address/events')
  @ApiOperation({ summary: 'Get contract events on a specific chain' })
  @ApiParam({ name: 'chain', description: 'Blockchain network' })
  @ApiParam({ name: 'address', description: 'Contract address' })
  @ApiBody({ schema: { example: { abi: [], eventName: 'Transfer', options: { fromBlock: 0, toBlock: 100 } } } })
  async getEvents(
    @Param('chain') chain: string,
    @Param('address') address: string,
    @Body() body: { abi: any; eventName: string; options: { fromBlock: number; toBlock?: number } },
  ) {
    return this.blockchainService.getEvents(chain, address, body.abi, body.eventName, body.options);
  }

  @Get(':chain/tx/:txHash')
  @ApiOperation({ summary: 'Get transaction details on a specific chain' })
  @ApiParam({ name: 'chain', description: 'Blockchain network' })
  @ApiParam({ name: 'txHash', description: 'Transaction hash' })
  async getTransaction(
    @Param('chain') chain: string,
    @Param('txHash') txHash: string,
  ) {
    return this.blockchainService.getTransaction(chain, txHash);
  }

  @Get(':chain/account/:address')
  @ApiOperation({ summary: 'Get account info on a specific chain' })
  @ApiParam({ name: 'chain', description: 'Blockchain network' })
  @ApiParam({ name: 'address', description: 'Account address' })
  async getAccount(
    @Param('chain') chain: string,
    @Param('address') address: string,
  ) {
    return this.blockchainService.getAccount(chain, address);
  }
}
