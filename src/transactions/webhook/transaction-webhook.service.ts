import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionEventDto } from './dto/transaction-event.dto';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class TransactionWebhookService {
  private readonly logger = new Logger(TransactionWebhookService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async processTransactionEvent(eventData: TransactionEventDto) {
    try {
      // Find the transaction
      const transaction = await this.transactionRepo.findOne({
        where: { id: eventData.transactionId },
        relations: ['user'],
      });

      if (!transaction) {
        this.logger.error(`Transaction not found: ${eventData.transactionId}`);
        return { success: false, error: 'Transaction not found' };
      }

      // Update transaction status
      const previousStatus = transaction.status;
      transaction.status = eventData.status;
      
      // Update other fields if available
      if (eventData.hash) transaction.hash = eventData.hash;
      if (eventData.blockNumber) transaction.blockNumber = eventData.blockNumber;
      if (eventData.error) transaction.error = eventData.error;
      if (eventData.metadata) transaction.metadata = eventData.metadata;

      // Save the updated transaction
      await this.transactionRepo.save(transaction);

      // Generate notification if status changed
      if (previousStatus !== eventData.status) {
        await this.generateStatusChangeNotification(transaction, previousStatus, eventData);
      }

      // If error occurred, send error notification
      if (eventData.error) {
        await this.generateErrorNotification(transaction, eventData);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing transaction event: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async generateStatusChangeNotification(
    transaction: Transaction,
    previousStatus: string,
    eventData: TransactionEventDto,
  ) {
    const userId = transaction.userId;
    const title = `Transaction Status Changed: ${previousStatus} → ${eventData.status}`;
    const message = `Your transaction ${transaction.id.substring(0, 8)}... has changed status from ${previousStatus} to ${eventData.status}.`;
    
    await this.notificationsService.dispatchTransactionNotification({
      userId,
      transactionId: transaction.id,
      title,
      message,
      eventType: 'status_change',
      metadata: {
        previousStatus,
        currentStatus: eventData.status,
        timestamp: eventData.timestamp,
      },
    });
  }

  private async generateErrorNotification(
    transaction: Transaction,
    eventData: TransactionEventDto,
  ) {
    const userId = transaction.userId;
    const title = `Transaction Error: ${transaction.id.substring(0, 8)}...`;
    const message = `Error in transaction: ${eventData.error}`;
    
    await this.notificationsService.dispatchTransactionNotification({
      userId,
      transactionId: transaction.id,
      title,
      message,
      eventType: 'error',
      metadata: {
        error: eventData.error,
        status: eventData.status,
        timestamp: eventData.timestamp,
      },
    });
  }
}