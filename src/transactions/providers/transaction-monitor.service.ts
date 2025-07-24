// @ts-ignore: Cannot find module '@nestjs/common' or its corresponding type declarations.
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
// @ts-ignore: Cannot find module '@nestjs/typeorm' or its corresponding type declarations.
import { InjectRepository } from '@nestjs/typeorm';
// @ts-ignore: Cannot find module 'typeorm' or its corresponding type declarations.
import { Repository } from 'typeorm';
// @ts-ignore: Cannot find module '@nestjs/config' or its corresponding type declarations.
import { ConfigService } from '@nestjs/config';
import { RpcProvider, constants } from 'starknet';
import { TransactionIndexService } from './transaction-index.service';
// @ts-ignore: Cannot find module '@nestjs/schedule' or its corresponding type declarations.
import { Cron } from '@nestjs/schedule';
import { TransactionStatus } from '../enums/transactionStatus.enum';
import { Transaction } from '../entities/transaction.entity';
import { TransactionEvent } from '../entities/transaction-event.entity';
import { EventType } from '../enums/EventType.enum';
import { TransactionType } from '../enums/transactionType.enum';
import { UsersService } from '../../users/users.service';
import { Notification } from '../../notifications/entities/notification.entity';
import { NotificationType } from '../../notifications/enums/notificationType.enum';
import { NotificationStatus } from '../../notifications/enums/notificationStatus.enum';
import { ComplianceRuleEngineService } from './compliance-rule-engine.service';
import { SuspiciousActivityDetectionService } from './suspicious-activity-detection.service';
import { RegulatoryReportingService } from './regulatory-reporting.service';

@Injectable()
export class TransactionMonitorService implements OnModuleInit {
  private readonly logger = new Logger(TransactionMonitorService.name);
  private provider: RpcProvider;
  private pollingInterval: NodeJS.Timeout;
  private readonly POLLING_INTERVAL = 15000; // 15 seconds
  private lastProcessedBlock = 0;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,

    @InjectRepository(TransactionEvent)
    private transactionEventRepository: Repository<TransactionEvent>,

    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    private configService: ConfigService,

    private transactionIndexService: TransactionIndexService,

    private readonly userService: UsersService,

    private readonly complianceRuleEngine: ComplianceRuleEngineService,
    private readonly suspiciousActivityDetection: SuspiciousActivityDetectionService,
    private readonly regulatoryReporting: RegulatoryReportingService,
  ) {
    // Initialize StarkNet provider
    const providerUrl = this.configService.get<string>('STARKNET_PROVIDER_URL');
    this.provider = new RpcProvider({ nodeUrl: providerUrl });
  }

  async onModuleInit() {
    // Get the last processed block from the database or start from the current block
    const latestTransaction = await this.transactionRepository.findOne({
      order: { blockNumber: 'DESC' },
    });

    this.lastProcessedBlock = latestTransaction?.blockNumber || 0;

    // Start polling for new blocks
    this.startPolling();
  }

  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.processNewBlocks();
      } catch (error) {
        this.logger.error(
          `Error processing new blocks: ${error.message}`,
          error.stack,
        );
      }
    }, this.POLLING_INTERVAL);
  }

  private async processNewBlocks() {
    const currentBlock = await this.provider.getBlockNumber();

    if (currentBlock <= this.lastProcessedBlock) {
      return;
    }

    this.logger.log(
      `Processing blocks from ${this.lastProcessedBlock + 1} to ${currentBlock}`,
    );

    // Process blocks in batches to avoid overloading
    const batchSize = 10;
    for (
      let i = this.lastProcessedBlock + 1;
      i <= currentBlock;
      i += batchSize
    ) {
      const endBlock = Math.min(i + batchSize - 1, currentBlock);
      await this.processBlockRange(i, endBlock);
      this.lastProcessedBlock = endBlock;
    }
  }

  private async processBlockRange(startBlock: number, endBlock: number) {
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      const block = await this.provider.getBlockWithTxs(blockNumber);

      if (!block || !block.transactions) {
        continue;
      }

      for (const tx of block.transactions) {
        await this.processTransaction(
          tx,
          blockNumber,
          new Date(block.timestamp * 1000),
        );
      }
    }
  }

  private async processTransaction(
    tx: any,
    blockNumber: number,
    blockTimestamp: Date,
  ) {
    try {
      // Check if transaction already exists
      const existingTransaction = await this.transactionRepository.findOne({
        where: { transactionHash: tx.transaction_hash },
      });

      if (existingTransaction) {
        // Update existing transaction
        await this.updateTransactionStatus(
          existingTransaction,
          tx,
          blockNumber,
          blockTimestamp,
        );
      } else {
        // Create new transaction
        await this.createNewTransaction(tx, blockNumber, blockTimestamp);
      }
    } catch (error) {
      this.logger.error(
        `Error processing transaction ${tx.transaction_hash}: ${error.message}`,
        error.stack,
      );

      // Store the transaction with error status to ensure it's not lost
      try {
        const { fromAddress } = await this.extractTransactionDetails(tx);
        await this.transactionRepository.save({
          transactionHash: tx.transaction_hash,
          fromAddress,
          status: TransactionStatus.FAILED,
          metadata: {
            rawTransaction: tx,
            processingError: error.message,
          },
        });
      } catch (fallbackError) {
        this.logger.error(
          `Critical error storing transaction: ${fallbackError.message}`,
          fallbackError.stack,
        );
      }
    }
  }

  private async createNewTransaction(
    tx: any,
    blockNumber: number,
    blockTimestamp: Date,
  ) {
    try {
      // Extract transaction details
      const transactionType = this.determineTransactionType(tx);
      const { fromAddress, toAddress, value, tokenSymbol, tokenAddress } =
        await this.extractTransactionDetails(tx);

      // Create new transaction
      const transaction = this.transactionRepository.create({
        transactionHash: tx.transaction_hash,
        fromAddress,
        toAddress,
        value,
        tokenSymbol,
        tokenAddress,
        status: TransactionStatus.CONFIRMED,
        type: transactionType,
        blockNumber,
        blockTimestamp,
        confirmations: 1,
        metadata: {
          rawTransaction: tx,
        },
      });

      // Compliance check
      const complianceFindings = this.complianceRuleEngine.evaluate(transaction);
      if (complianceFindings.length > 0) {
        transaction.metadata.flaggedReasons = [
          ...(transaction.metadata.flaggedReasons || []),
          ...complianceFindings.map(f => `compliance:${f.ruleId}`),
        ];
      }

      // Suspicious activity detection
      const anomalies = this.suspiciousActivityDetection.detectAnomalies(transaction);
      if (anomalies.length > 0) {
        transaction.metadata.flaggedReasons = [
          ...(transaction.metadata.flaggedReasons || []),
          ...anomalies.map(a => `anomaly:${a}`),
        ];
      }

      // Save transaction
      const savedTransaction =
        await this.transactionRepository.save(transaction);

      // Create transaction event
      await this.transactionEventRepository.save({
        transaction: savedTransaction,
        transactionId: savedTransaction.id,
        type: EventType.TRANSACTION_CONFIRMED,
        data: {
          blockNumber,
          timestamp: blockTimestamp,
        },
      });

      // Index the transaction
      await this.transactionIndexService.indexTransaction(savedTransaction);

      // If flagged, trigger reporting (stub: extend as needed)
      if (transaction.metadata.flaggedReasons && transaction.metadata.flaggedReasons.length > 0) {
        // For now, just log the CSV report for this transaction
        const csv = this.regulatoryReporting.generateCsvReport([savedTransaction]);
        this.logger.warn(`Regulatory report for flagged transaction:\n${csv}`);
      }

      this.logger.log(`Created new transaction: ${tx.transaction_hash}`);
    } catch (error) {
      this.logger.error(
        `Error creating transaction: ${error.message}`,
        error.stack,
      );
    }
  }

  private async updateTransactionStatus(
    transaction: Transaction,
    tx: any,
    blockNumber: number,
    blockTimestamp: Date,
  ) {
    try {
      // Update transaction status
      transaction.status = TransactionStatus.CONFIRMED;
      transaction.blockNumber = blockNumber;
      transaction.blockTimestamp = blockTimestamp;
      transaction.confirmations += 1;

      // Save updated transaction
      await this.transactionRepository.save(transaction);

      // Create transaction event
      await this.transactionEventRepository.save({
        transaction,
        transactionId: transaction.id,
        type: EventType.STATUS_UPDATED,
        data: {
          previousStatus: transaction.status,
          newStatus: TransactionStatus.CONFIRMED,
          blockNumber,
          timestamp: blockTimestamp,
        },
      });

      this.logger.log(
        `Updated transaction status: ${transaction.transactionHash}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating transaction status: ${error.message}`,
        error.stack,
      );
    }
  }

  private determineTransactionType(tx: any): TransactionType {
    // Implement logic to determine transaction type based on tx data
    // This is a simplified example - you'll need to adapt this to StarkNet specifics
    if (tx.calldata && tx.calldata.includes('transfer')) {
      return TransactionType.TRANSFER;
    } else if (tx.calldata && tx.calldata.includes('swap')) {
      return TransactionType.SWAP;
    } else if (tx.calldata && tx.calldata.includes('addLiquidity')) {
      return TransactionType.LIQUIDITY;
    } else if (tx.calldata && tx.calldata.includes('stake')) {
      return TransactionType.STAKE;
    } else if (tx.calldata && tx.calldata.includes('unstake')) {
      return TransactionType.UNSTAKE;
    } else if (tx.calldata && tx.calldata.includes('claim')) {
      return TransactionType.CLAIM;
    }

    return TransactionType.OTHER;
  }

  private async extractTransactionDetails(tx: any) {
    // Implement logic to extract transaction details
    // This is a simplified example - you'll need to adapt this to StarkNet specifics
    try {
      const receipt = await this.provider.getTransactionReceipt(
        tx.transaction_hash,
      );

      // Extract from and to addresses
      const fromAddress = tx.sender_address || '';
      const toAddress =
        tx.calldata && tx.calldata.length > 1 ? tx.calldata[0] : null;

      // Extract value and token information
      let value = 0;
      let tokenSymbol;
      let tokenAddress;

      if (receipt) {
        // Look for transfer events
        for (const event of []) {
          if (event === 5) {
            // This is a transfer event
            tokenAddress = 'jfefjlefwef';
            value = Number.parseInt(event, 16) / 1e18; // Convert from wei to ether

            // You would need to fetch token symbol from a token service
            tokenSymbol = await this.getTokenSymbol(tokenAddress);
            break;
          }
        }
      }

      return { fromAddress, toAddress, value, tokenSymbol, tokenAddress };
    } catch (error) {
      this.logger.error(
        `Error extracting transaction details: ${error.message}`,
        error.stack,
      );
      return {
        fromAddress: '',
        toAddress: null,
        value: 0,
        tokenSymbol: null,
        tokenAddress: null,
      };
    }
  }

  private async getTokenSymbol(tokenAddress: string): Promise<string> {
    // Implement logic to get token symbol from token address
    // This would typically involve calling the token contract's symbol method
    // or looking up the token in a database
    return 'UNKNOWN';
  }

  // Public methods for manual transaction tracking
  async trackTransaction(
    transactionHash: string,
    userId?: string,
  ): Promise<Transaction> {
    try {
      // Check if transaction already exists
      let transaction = await this.transactionRepository.findOne({
        where: { transactionHash },
      });

      if (transaction) {
        return transaction;
      }

      // Fetch transaction from StarkNet
      const tx = await this.provider.getTransaction(transactionHash);

      if (!tx) {
        throw new Error(`Transaction not found: ${transactionHash}`);
      }

      // Extract transaction details
      const transactionType = this.determineTransactionType(tx);
      const { fromAddress, toAddress, value, tokenSymbol, tokenAddress } =
        await this.extractTransactionDetails(tx);

      // Create new transaction
      transaction = this.transactionRepository.create({
        transactionHash,
        fromAddress,
        toAddress,
        value,
        tokenSymbol,
        tokenAddress,
        status: TransactionStatus.PENDING,
        type: transactionType,
        userId,
        metadata: {
          rawTransaction: tx,
        },
      });

      // Save transaction
      const savedTransaction =
        await this.transactionRepository.save(transaction);

      // Create transaction event
      await this.transactionEventRepository.save({
        transaction: savedTransaction,
        transactionId: savedTransaction.id,
        type: EventType.TRANSACTION_CREATED,
        data: {
          timestamp: new Date(),
        },
      });

      // Start monitoring this transaction for status updates
      this.monitorTransactionStatus(savedTransaction);

      return savedTransaction;
    } catch (error) {
      this.logger.error(
        `Error tracking transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async monitorTransactionStatus(transaction: Transaction) {
    // Implement logic to periodically check transaction status
    const checkStatus = async () => {
      try {
        const receipt = await this.provider.getTransactionReceipt(
          transaction.transactionHash,
        );

        if (receipt) {
          // Transaction is confirmed
          const block = await this.provider.getBlockWithTxs(10);

          transaction.status = TransactionStatus.CONFIRMED;
          transaction.blockNumber = 10;
          transaction.blockTimestamp = new Date(block.timestamp * 1000);
          transaction.confirmations = 1;

          await this.transactionRepository.save(transaction);

          // Create transaction event
          await this.transactionEventRepository.save({
            transaction,
            transactionId: transaction.id,
            type: EventType.TRANSACTION_CONFIRMED,
            data: {
              blockNumber: 10,
              timestamp: new Date(block.timestamp * 1000),
            },
          });

          // Index the transaction
          await this.transactionIndexService.indexTransaction(transaction);

          this.logger.log(
            `Transaction confirmed: ${transaction.transactionHash}`,
          );
          return;
        }

        // Check again after a delay
        setTimeout(checkStatus, 30000); // Check every 30 seconds
      } catch (error) {
        this.logger.error(
          `Error monitoring transaction status: ${error.message}`,
          error.stack,
        );

        // If there's an error, check again after a delay
        setTimeout(checkStatus, 60000); // Check every 60 seconds after an error
      }
    };

    // Start checking status
    checkStatus();
  }

  @Cron('0 */1 * * * *') // Run every minute
  async verifyTransactionIntegrity() {
    try {
      // Find transactions with FAILED status
      const failedTransactions = await this.transactionRepository.find({
        where: { status: TransactionStatus.FAILED },
        take: 50, // Process in batches
      });

      for (const transaction of failedTransactions) {
        try {
          // Attempt to fetch the transaction from the blockchain
          const tx = await this.provider.getTransaction(
            transaction.transactionHash,
          );
          if (!tx) continue;

          // Get block information
          const receipt = await this.provider.getTransactionReceipt(
            transaction.transactionHash,
          );
          if (!receipt || 10) continue;

          const block = await this.provider.getBlockWithTxs(10);

          // Retry processing
          await this.processTransaction(
            tx,
            10,
            new Date(block.timestamp * 1000),
          );

          this.logger.log(
            `Successfully reprocessed failed transaction: ${transaction.transactionHash}`,
          );
        } catch (error) {
          this.logger.error(
            `Error reprocessing transaction ${transaction.transactionHash}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in transaction integrity verification: ${error.message}`,
        error.stack,
      );
    }
  }

  //FN TO TRIGGER  TRANSACTION NOTIFICATION
  public async notifyTransactionEvent({
    userId,
    transactionId,
    eventType,
    metadata = {},
  }: {
    userId: string;
    transactionId: string;
    eventType: 'status_change' | 'error' | 'confirmation' | 'other';
    metadata?: any;
  }) {
    const user = await this.userService.findById(userId);

    const titleMap = {
      status_change: 'Transaction Status Updated',
      error: 'Transaction Failed',
      confirmation: 'Transaction Confirmed',
      other: 'Transaction Notification',
    };

    const messageMap = {
      status_change: `Your transaction has updated status.`,
      error: `There was an error with your transaction.`,
      confirmation: `Your transaction has been confirmed.`,
      other: `You have a new transaction update.`,
    };

    const title = titleMap[eventType];
    const message = messageMap[eventType];

    // Save to TransactionNotification
    await this.transactionRepository.save({
      userId,
      transactionId,
      eventType,
      title,
      message,
      metadata,
      channel: 'in_app', // Can be customized to email, push later
    });

    // Save to general Notification
    await this.notificationRepo.save({
      userId,
      title,
      content: message,
      metadata: { ...metadata, transactionId, eventType },
      channel: 'in_app',
      status: NotificationStatus.PENDING, // Use enum instead of string
    });
  }
}
