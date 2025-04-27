import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionIndex } from '../entities/transaction-index.entity';

@Injectable()
export class TransactionIndexService {
  private readonly logger = new Logger(TransactionIndexService.name);

  constructor(
    @InjectRepository(TransactionIndex)
    private transactionIndexRepository: Repository<TransactionIndex>,
  ) {}

  async indexTransaction(transaction: Transaction): Promise<void> {
    try {
      // Check if transaction is already indexed
      const existingIndex = await this.transactionIndexRepository.findOne({
        where: { transactionHash: transaction.transactionHash },
      });

      if (existingIndex) {
        // Update existing index
        await this.updateTransactionIndex(existingIndex, transaction);
        return;
      }

      // Categorize transaction
      const { category, subcategory } = this.categorizeTransaction(transaction);

      // Create search metadata
      const searchMetadata = this.createSearchMetadata(transaction);

      // Create new index
      const transactionIndex = this.transactionIndexRepository.create({
        transactionHash: transaction.transactionHash,
        address: transaction.fromAddress,
        category,
        subcategory,
        searchMetadata,
      });

      // Save index
      await this.transactionIndexRepository.save(transactionIndex);

      this.logger.log(`Indexed transaction: ${transaction.transactionHash}`);
    } catch (error) {
      this.logger.error(
        `Error indexing transaction: ${error.message}`,
        error.stack,
      );
    }
  }

  private async updateTransactionIndex(
    index: TransactionIndex,
    transaction: Transaction,
  ): Promise<void> {
    try {
      // Categorize transaction
      const { category, subcategory } = this.categorizeTransaction(transaction);

      // Update search metadata
      const searchMetadata = this.createSearchMetadata(transaction);

      // Update index
      index.category = category;
      index.subcategory = subcategory;
      index.searchMetadata = searchMetadata;

      // Save updated index
      await this.transactionIndexRepository.save(index);

      this.logger.log(
        `Updated transaction index: ${transaction.transactionHash}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating transaction index: ${error.message}`,
        error.stack,
      );
    }
  }

  private categorizeTransaction(transaction: Transaction): {
    category: string;
    subcategory: string;
  } {
    // Implement transaction categorization logic
    // This is a simplified example - you'll need to adapt this to your specific needs

    let category = 'unknown';
    let subcategory = 'unknown';

    switch (transaction.type) {
      case 'transfer':
        category = 'transfer';
        subcategory = transaction.tokenSymbol || 'eth';
        break;
      case 'swap':
        category = 'swap';
        subcategory = transaction.metadata?.swapPair || 'unknown';
        break;
      case 'liquidity':
        category = 'liquidity';
        subcategory = transaction.metadata?.pool || 'unknown';
        break;
      case 'stake':
        category = 'stake';
        subcategory = transaction.metadata?.stakingPool || 'unknown';
        break;
      case 'unstake':
        category = 'unstake';
        subcategory = transaction.metadata?.stakingPool || 'unknown';
        break;
      case 'claim':
        category = 'claim';
        subcategory = transaction.metadata?.rewardType || 'unknown';
        break;
      default:
        // Analyze transaction data for more specific categorization
        if (transaction.metadata?.rawTransaction?.calldata) {
          const calldata = transaction.metadata.rawTransaction.calldata;

          // Check for specific function calls or patterns
          if (calldata.includes('approve')) {
            category = 'approval';
            subcategory = transaction.tokenSymbol || 'token';
          } else if (calldata.includes('mint')) {
            category = 'mint';
            subcategory = transaction.tokenSymbol || 'nft';
          }
        }
        break;
    }

    return { category, subcategory };
  }

  private createSearchMetadata(transaction: Transaction): Record<string, any> {
    // Create metadata for search indexing
    return {
      transactionHash: transaction.transactionHash,
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      value: transaction.value.toString(),
      tokenSymbol: transaction.tokenSymbol,
      tokenAddress: transaction.tokenAddress,
      type: transaction.type,
      status: transaction.status,
      blockNumber: transaction.blockNumber,
      timestamp: transaction.blockTimestamp?.toISOString(),
      // Add any other fields that might be useful for searching
    };
  }

  async searchTransactions(
    query: string,
    filters: Record<string, any> = {},
  ): Promise<TransactionIndex[]> {
    try {
      // Build query
      const queryBuilder =
        this.transactionIndexRepository.createQueryBuilder('index');

      // Add search condition
      if (query) {
        queryBuilder.where(
          'index.transactionHash ILIKE :query OR ' +
            'index.address ILIKE :query OR ' +
            'index.searchMetadata::text ILIKE :query',
          { query: `%${query}%` },
        );
      }

      // Add filters
      if (filters.category) {
        queryBuilder.andWhere('index.category = :category', {
          category: filters.category,
        });
      }

      if (filters.subcategory) {
        queryBuilder.andWhere('index.subcategory = :subcategory', {
          subcategory: filters.subcategory,
        });
      }

      if (filters.address) {
        queryBuilder.andWhere('index.address = :address', {
          address: filters.address,
        });
      }

      // Add sorting
      queryBuilder.orderBy('index.createdAt', 'DESC');

      // Add pagination
      if (filters.limit) {
        queryBuilder.limit(filters.limit);
      }

      if (filters.offset) {
        queryBuilder.offset(filters.offset);
      }

      // Execute query
      return queryBuilder.getMany();
    } catch (error) {
      this.logger.error(
        `Error searching transactions: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
