import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { TransactionService } from './providers/transactions.service';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../transactions/dto/update-transaction.dto';
import { SearchTransactionsDto } from '../transactions/dto/search-transactions.dto';
import { Transaction } from './entities/transaction.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '../users/users.entity';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a new transaction',
    description: 'Creates a new transaction for the authenticated user.',
  })
  @ApiBody({
    description: 'Transaction creation payload',
    type: CreateTransactionDto,
    examples: {
      example1: {
        summary: 'Transfer transaction',
        value: {
          userId: 'user-uuid',
          type: 'transfer',
          amount: 100,
          asset: 'ETH',
          to: '0xabc...',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The transaction has been successfully created.',
    type: Transaction,
    examples: {
      example1: {
        summary: 'Successful transaction creation',
        value: {
          id: 'tx-uuid',
          userId: 'user-uuid',
          type: 'transfer',
          amount: 100,
          asset: 'ETH',
          to: '0xabc...',
          createdAt: '2023-08-15T10:23:45.123Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @GetUser() user: User,
    @Body() createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    // Set the user ID if not provided
    if (!createTransactionDto.userId) {
      createTransactionDto.userId = user.id;
    }

    return this.transactionService.create(createTransactionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get all transactions',
    description: 'Returns all transactions, optionally filtered by user.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all transactions.',
    type: [Transaction],
    examples: {
      example1: {
        summary: 'List of user transactions',
        value: [
          {
            id: 'tx-uuid',
            userId: 'user-uuid',
            type: 'transfer',
            amount: 100,
            asset: 'ETH',
            to: '0x...',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(@Query('userId') userId?: string): Promise<Transaction[]> {
    return this.transactionService.findAll(userId);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Search transactions',
    description: 'Search transactions with advanced filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Return matching transactions.',
    type: [Transaction],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async search(
    @Query() searchDto: SearchTransactionsDto,
  ): Promise<{ data: Transaction[]; total: number }> {
    return this.transactionService.search(searchDto);
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get transactions by status',
    description: 'Returns transactions filtered by status.',
  })
  @ApiParam({
    name: 'status',
    enum: ['pending', 'confirmed', 'rejected', 'failed'],
    description: 'Transaction status',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return transactions with the specified status.',
    type: [Transaction],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getByStatus(
    @Param('status') status: string,
    @Query('userId') userId?: string,
  ): Promise<Transaction[]> {
    return this.transactionService.getTransactionsByStatus(
      status as any,
      userId,
    );
  }

  @Get('type/:type')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get transactions by type',
    description: 'Returns transactions filtered by type.',
  })
  @ApiParam({
    name: 'type',
    enum: [
      'transfer',
      'swap',
      'liquidity',
      'stake',
      'unstake',
      'claim',
      'other',
    ],
    description: 'Transaction type',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return transactions with the specified type.',
    type: [Transaction],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getByType(
    @Param('type') type: string,
    @Query('userId') userId?: string,
  ): Promise<Transaction[]> {
    return this.transactionService.getTransactionsByType(type as any, userId);
  }

  @Get('address/:address')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get transactions by address',
    description: 'Returns transactions filtered by Ethereum address.',
  })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({
    name: 'isFrom',
    required: false,
    description: 'Filter by from address (true) or to address (false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Return transactions with the specified address.',
    type: [Transaction],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getByAddress(
    @Param('address') address: string,
    @Query('isFrom') isFrom?: boolean,
  ): Promise<Transaction[]> {
    return this.transactionService.getTransactionsByAddress(
      address,
      isFrom !== false,
    );
  }

  @Get('date-range')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get transactions by date range',
    description: 'Returns transactions within the specified date range.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date (ISO format)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return transactions within the specified date range.',
    type: [Transaction],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
  ): Promise<Transaction[]> {
    return this.transactionService.getTransactionsByDateRange(
      new Date(startDate),
      new Date(endDate),
      userId,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get a transaction by ID',
    description: 'Returns a transaction by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the transaction.',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Transaction> {
    return this.transactionService.findOne(id);
  }

  @Get('hash/:hash')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get a transaction by hash',
    description: 'Returns a transaction by its hash.',
  })
  @ApiParam({ name: 'hash', description: 'Transaction hash' })
  @ApiResponse({
    status: 200,
    description: 'Return the transaction.',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByHash(@Param('hash') hash: string): Promise<Transaction> {
    return this.transactionService.findByHash(hash);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update a transaction',
    description: 'Updates a transaction by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiBody({
    description: 'Transaction update payload',
    type: UpdateTransactionDto,
    examples: {
      example1: {
        summary: 'Update status',
        value: { status: 'confirmed' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'The transaction has been successfully updated.',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Delete a transaction',
    description: 'Deletes a transaction by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'The transaction has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.transactionService.remove(id);
  }
}
