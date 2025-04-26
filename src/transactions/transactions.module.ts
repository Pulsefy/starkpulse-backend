import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import {TransactionsService } from './transactions.service';
import { TransactionsController} from './transactions.controller';
import { TransactionWebhookController } from './webhook/transaction-webhook.controller';
import { TransactionWebhookService } from './webhook/transaction-webhook.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    NotificationsModule,
  ],
  providers: [TransactionsService, TransactionWebhookService],
  controllers: [TransactionsController, TransactionWebhookController],
  exports: [TransactionsService],
})
export class TransactionsModule {}