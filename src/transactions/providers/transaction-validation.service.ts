import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionStatus } from '../enums/transactionStatus.enum';
import { Transaction } from '../entities/transaction.entity';
import { TransactionEvent } from '../entities/transaction-event.entity';
import { EventType } from '../enums/EventType.enum';
import { ConfigService } from '@nestjs/config';
import { RpcProvider } from 'starknet';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TransactionValidationService {
  private readonly logger = new Logger(TransactionValidationService.name);
  private provider: RpcProvider;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionEvent)
    private readonly transactionEventRepository: Repository<TransactionEvent>,
    private readonly configService: ConfigService,
  ) {
    // Initialize StarkNet provider
    const providerUrl = this.configService.get<string>('STARKNET_PROVIDER_URL');
    this.provider = new RpcProvider({ nodeUrl: providerUrl });
  }

  @Cron('0 */15 * * * *') // Run every 15 minutes
  async validatePendingTransactions() {
    this.logger.log('Starting validation of pending transactions');

    try {
      // Find transactions that have been pending for more than 1 hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const pendingTransactions = await this.transactionRepository.find({
        where: {
          status: TransactionStatus.PENDING,
        },
        take: 100, // Process in batches
      });

      this.logger.log(
        `Found ${pendingTransactions.length} pending transactions to validate`,
      );

      for (const transaction of pendingTransactions) {
        try {
          // Check transaction status on the blockchain
          const receipt = await this.provider.getTransactionReceipt(
            transaction.transactionHash,
          );

          if (!receipt) {
            // Transaction not found on chain after 1 hour, mark as rejected
            if (
              new Date().getTime() - transaction.createdAt.getTime() >
              3600000
            ) {
              transaction.status = TransactionStatus.REJECTED;
              await this.transactionRepository.save(transaction);

              // Create transaction event
              await this.transactionEventRepository.save({
                transaction,
                transactionId: transaction.id,
                type: EventType.TRANSACTION_REJECTED,
                data: {
                  reason: 'Transaction not found on chain after 1 hour',
                  timestamp: new Date(),
                },
              });

              this.logger.log(
                `Marked transaction as rejected: ${transaction.transactionHash}`,
              );
            }
            continue;
          }

          // If we have a receipt but status is still pending, update to confirmed
          let status: undefined;

          if (status) {
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

            this.logger.log(
              `Updated transaction status to confirmed: ${transaction.transactionHash}`,
            );
          } else if (!status) {
            transaction.status = TransactionStatus.FAILED;
            await this.transactionRepository.save(transaction);

            // Create transaction event
            await this.transactionEventRepository.save({
              transaction,
              transactionId: transaction.id,
              type: EventType.TRANSACTION_FAILED,
              data: {
                reason: 'Transaction execution reverted',
                timestamp: new Date(),
              },
            });

            this.logger.log(
              `Marked transaction as failed: ${transaction.transactionHash}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error validating transaction ${transaction.transactionHash}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in transaction validation: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('0 0 */6 * * *') // Run every 6 hours
  async validateConfirmations() {
    this.logger.log('Starting validation of transaction confirmations');

    try {
      // Find confirmed transactions with less than 10 confirmations
      const confirmedTransactions = await this.transactionRepository.find({
        where: {
          status: TransactionStatus.CONFIRMED,
        },
        take: 200, // Process in batches
      });

      this.logger.log(
        `Found ${confirmedTransactions.length} transactions to update confirmations`,
      );

      const currentBlock = await this.provider.getBlockNumber();

      for (const transaction of confirmedTransactions) {
        try {
          if (!transaction.blockNumber) continue;

          const confirmations = currentBlock - transaction.blockNumber + 1;

          if (confirmations > transaction.confirmations) {
            transaction.confirmations = confirmations;
            await this.transactionRepository.save(transaction);

            this.logger.log(
              `Updated confirmations for transaction ${transaction.transactionHash}: ${confirmations}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error updating confirmations for transaction ${transaction.transactionHash}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in confirmation validation: ${error.message}`,
        error.stack,
      );
    }
  }
}
