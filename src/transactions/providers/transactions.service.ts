import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionStatus } from '../enums/transactionStatus.enum';
import { TransactionType } from '../enums/transactionType.enum';
import { TransactionEvent } from '../entities/transaction-event.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { SearchTransactionsDto } from '../dto/search-transactions.dto';
import { TransactionMonitorService } from './transaction-monitor.service';
import { TransactionIndexService } from './transaction-index.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,

    @InjectRepository(TransactionEvent)
    private transactionEventRepository: Repository<TransactionEvent>,

    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,

    private transactionMonitorService: TransactionMonitorService,

    private transactionIndexService: TransactionIndexService,

  ) {}

   categorizeTransaction(functionName: string): TransactionType {
    const fn = functionName?.toLowerCase();
    if (fn?.includes('transfer')) return TransactionType.TRANSFER;
    if (fn?.includes('swap')) return TransactionType.SWAP;
    if (fn?.includes('liquidity')) return TransactionType.LIQUIDITY;
    if (fn?.includes('stake') && !fn.includes('unstake')) return TransactionType.STAKE;
    if (fn?.includes('unstake')) return TransactionType.UNSTAKE;
    if (fn?.includes('claim')) return TransactionType.CLAIM;
    return TransactionType.OTHER;
  }

  detectAnomalies(tx: Transaction): string[] {
    const anomalies: string[] = [];
    if (tx.value > 100_000) anomalies.push('high_value');
    if (tx.status === TransactionStatus.FAILED && tx.retries > 3) anomalies.push('repeated_failures');
    if (tx.type === TransactionType.OTHER) anomalies.push('unknown_function');
    return anomalies;
  }

   async getUserAnalytics(userId: string) {
    const total = await this.txRepo.count({ where: { userId } });
    const confirmed = await this.txRepo.count({ where: { userId, status: TransactionStatus.CONFIRMED } });
    const failed = await this.txRepo.count({ where: { userId, status: TransactionStatus.FAILED } });

    const mostCommonType = await this.txRepo
      .createQueryBuilder('tx')
      .select('tx.type')
      .addSelect('COUNT(*)', 'count')
      .where('tx.userId = :userId', { userId })
      .groupBy('tx.type')
      .orderBy('count', 'DESC')
      .getRawOne();

    return {
      total,
      confirmed,
      failed,
      mostCommonType: mostCommonType?.tx_type || 'unknown',
    };
  }

  // Mock Blockchain API check
  private async mockBlockchainCheck(hash: string): Promise<TransactionStatus> {
    const statuses = [TransactionStatus.CONFIRMED, TransactionStatus.FAILED, TransactionStatus.PENDING];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    try {
      // Track transaction using the monitor service
      return this.transactionMonitorService.trackTransaction(
        createTransactionDto.transactionHash,
        createTransactionDto.userId,
      );
    } catch (error) {
      this.logger.error(
        `Error creating transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(userId?: string): Promise<Transaction[]> {
    try {
      const where: FindOptionsWhere<Transaction> = {};

      if (userId) {
        where.userId = userId;
      }

      return this.transactionRepository.find({
        where,
        order: { createdAt: 'DESC' },
        relations: ['events'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding transactions: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async findOne(id: string): Promise<Transaction> {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id },
        relations: ['events'],
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }

      return transaction;
    } catch (error) {
      this.logger.error(
        `Error finding transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByHash(transactionHash: string): Promise<Transaction> {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { transactionHash },
        relations: ['events'],
      });

      if (!transaction) {
        throw new NotFoundException(
          `Transaction with hash ${transactionHash} not found`,
        );
      }

      return transaction;
    } catch (error) {
      this.logger.error(
        `Error finding transaction by hash: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    try {
      const transaction = await this.findOne(id);

      // Update transaction fields
      Object.assign(transaction, updateTransactionDto);

      // Save updated transaction
      return this.transactionRepository.save(transaction);
    } catch (error) {
      this.logger.error(
        `Error updating transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const transaction = await this.findOne(id);

      // Remove transaction events first
      await this.transactionEventRepository.delete({ transactionId: id });

      // Remove transaction
      await this.transactionRepository.remove(transaction);
    } catch (error) {
      this.logger.error(
        `Error removing transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async search(
    searchDto: SearchTransactionsDto,
  ): Promise<{ data: Transaction[]; total: number }> {
    try {
      // Use the index service to search for transactions
      const indices = await this.transactionIndexService.searchTransactions(
        searchDto.query ?? '',
        {
          category: searchDto.category,
          subcategory: searchDto.subcategory,
          address: searchDto.address,
          limit: searchDto.limit,
          offset: searchDto.offset,
        },
      );

      if (!indices.length) {
        return { data: [], total: 0 };
      }

      // Get transaction hashes from indices
      const transactionHashes = indices.map((index) => index.transactionHash);

      // Find transactions by hashes
      const transactions = await this.transactionRepository.find({
        where: { transactionHash: In(transactionHashes) },
        relations: ['events'],
      });

      // Sort transactions to match the order of indices
      const sortedTransactions = transactionHashes
        .map((hash) => transactions.find((tx) => tx.transactionHash === hash))
        .filter((tx): tx is Transaction => Boolean(tx));

      // Get total count
      const total = await this.transactionRepository.count({
        where: { transactionHash: In(transactionHashes) },
      });

      return { data: sortedTransactions, total };
    } catch (error) {
      this.logger.error(
        `Error searching transactions: ${error.message}`,
        error.stack,
      );
      return { data: [], total: 0 };
    }
  }

  async getTransactionsByStatus(
    status: TransactionStatus,
    userId?: string,
  ): Promise<Transaction[]> {
    try {
      const where: FindOptionsWhere<Transaction> = { status };

      if (userId) {
        where.userId = userId;
      }

      return this.transactionRepository.find({
        where,
        order: { createdAt: 'DESC' },
        relations: ['events'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding transactions by status: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async getTransactionsByType(
    type: TransactionType,
    userId?: string,
  ): Promise<Transaction[]> {
    try {
      const where: FindOptionsWhere<Transaction> = { type };

      if (userId) {
        where.userId = userId;
      }

      return this.transactionRepository.find({
        where,
        order: { createdAt: 'DESC' },
        relations: ['events'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding transactions by type: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async getTransactionsByAddress(
    address: string,
    isFrom = true,
  ): Promise<Transaction[]> {
    try {
      const where: FindOptionsWhere<Transaction> = isFrom
        ? { fromAddress: address }
        : { toAddress: address };

      return this.transactionRepository.find({
        where,
        order: { createdAt: 'DESC' },
        relations: ['events'],
      });
    } catch (error) {
      this.logger.error(
        `Error finding transactions by address: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<Transaction[]> {
    try {
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate })
        .andWhere('transaction.createdAt <= :endDate', { endDate })
        .orderBy('transaction.createdAt', 'DESC')
        .leftJoinAndSelect('transaction.events', 'events');

      if (userId) {
        queryBuilder.andWhere('transaction.userId = :userId', { userId });
      }

      return queryBuilder.getMany();
    } catch (error) {
      this.logger.error(
        `Error finding transactions by date range: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  // Update transaction status and trigger notification
  public async updateTransactionStatus(
    transactionId: string,
    newStatus: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.status = newStatus;
    await this.transactionRepository.save(transaction);

    // Trigger notification for status change
    await this.transactionMonitorService.notifyTransactionEvent({
      userId: transaction.userId, // Assuming you have userId linked
      transactionId: transaction.id,
      eventType: 'status_change',
      metadata: { status: newStatus },
    });
    return transaction;
  }

  private mapStatusToEventType(
    status: string,
  ): 'status_change' | 'error' | 'confirmation' | 'other' {
    if (status === 'FAILED') return 'error';
    if (status === 'CONFIRMED') return 'confirmation';
    if (status === 'PENDING') return 'status_change';
    return 'other';
  }

  // Assume you have various states to handle:
  public async handleTransactionCreated(transactionId: string) {
    await this.updateTransactionStatus(transactionId, 'PENDING');
    // You could also trigger an initial notification
  }

  public async handleTransactionConfirmed(transactionId: string) {
    await this.updateTransactionStatus(transactionId, 'CONFIRMED');
  }

  public async handleTransactionFailed(transactionId: string) {
    await this.updateTransactionStatus(transactionId, 'FAILED');
  }
}
