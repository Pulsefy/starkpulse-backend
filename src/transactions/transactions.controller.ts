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
} from '@nestjs/swagger';
import { TransactionService } from './providers/transactions.service';
import { CreateTransactionDto } from 'src/transactions/dto/create-transaction.dto';
import { UpdateTransactionDto } from 'src/transactions/dto/update-transaction.dto';
import { SearchTransactionsDto } from 'src/transactions/dto/search-transactions.dto';
import { Transaction } from './entities/transaction.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { User } from 'src/users/users.entity';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'The transaction has been successfully created.',
    type: Transaction,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
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
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({
    status: 200,
    description: 'Return all transactions.',
    type: [Transaction],
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  async findAll(@Query('userId') userId?: string): Promise<Transaction[]> {
    return this.transactionService.findAll(userId);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search transactions' })
  @ApiResponse({
    status: 200,
    description: 'Return matching transactions.',
    type: [Transaction],
  })
  async search(
    @Query() searchDto: SearchTransactionsDto,
  ): Promise<{ data: Transaction[]; total: number }> {
    return this.transactionService.search(searchDto);
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get transactions by status' })
  @ApiResponse({
    status: 200,
    description: 'Return transactions with the specified status.',
    type: [Transaction],
  })
  @ApiParam({
    name: 'status',
    enum: ['pending', 'confirmed', 'rejected', 'failed'],
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
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
  @ApiOperation({ summary: 'Get transactions by type' })
  @ApiResponse({
    status: 200,
    description: 'Return transactions with the specified type.',
    type: [Transaction],
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
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  async getByType(
    @Param('type') type: string,
    @Query('userId') userId?: string,
  ): Promise<Transaction[]> {
    return this.transactionService.getTransactionsByType(type as any, userId);
  }

  @Get('address/:address')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get transactions by address' })
  @ApiResponse({
    status: 200,
    description: 'Return transactions with the specified address.',
    type: [Transaction],
  })
  @ApiParam({ name: 'address', description: 'Ethereum address' })
  @ApiQuery({
    name: 'isFrom',
    required: false,
    description: 'Filter by from address (true) or to address (false)',
  })
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
  @ApiOperation({ summary: 'Get transactions by date range' })
  @ApiResponse({
    status: 200,
    description: 'Return transactions within the specified date range.',
    type: [Transaction],
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
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the transaction.',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Transaction> {
    return this.transactionService.findOne(id);
  }

  @Get('hash/:hash')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a transaction by hash' })
  @ApiResponse({
    status: 200,
    description: 'Return the transaction.',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiParam({ name: 'hash', description: 'Transaction hash' })
  async findByHash(@Param('hash') hash: string): Promise<Transaction> {
    return this.transactionService.findByHash(hash);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({
    status: 200,
    description: 'The transaction has been successfully updated.',
    type: Transaction,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({
    status: 200,
    description: 'The transaction has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.transactionService.remove(id);
  }
}
