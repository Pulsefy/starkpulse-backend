import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './providers/transactions.service';
import { TransactionController } from './transactions.controller';
import { TransactionWebhookController } from './webhook/transaction-webhook.controller';
import { TransactionWebhookService } from './webhook/transaction-webhook.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TransactionEvent } from './entities/transaction-event.entity';
import { TransactionIndex } from './entities/transaction-index.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionEvent, TransactionIndex]),
    NotificationsModule,
  ],
  providers: [TransactionService, TransactionWebhookService],
  controllers: [TransactionController, TransactionWebhookController],
  exports: [TransactionService],
})
export class TransactionsModule {}
