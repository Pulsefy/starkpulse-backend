// @ts-ignore: Cannot find module '@nestjs/common' or its corresponding type declarations.
import { Module } from '@nestjs/common';
// @ts-ignore: Cannot find module '@nestjs/typeorm' or its corresponding type declarations.
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './providers/transactions.service';
import { TransactionController } from './transactions.controller';
import { TransactionWebhookController } from './webhook/transaction-webhook.controller';
import { TransactionWebhookService } from './webhook/transaction-webhook.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { TransactionEvent } from './entities/transaction-event.entity';
import { TransactionIndex } from './entities/transaction-index.entity';
import { ComplianceRuleEngineService } from './providers/compliance-rule-engine.service';
import { SuspiciousActivityDetectionService } from './providers/suspicious-activity-detection.service';
import { RegulatoryReportingService } from './providers/regulatory-reporting.service';
import { TransactionMonitorService } from './providers/transaction-monitor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionEvent, TransactionIndex]),
    NotificationsModule,
  ],
  providers: [
    TransactionService,
    TransactionWebhookService,
    ComplianceRuleEngineService,
    SuspiciousActivityDetectionService,
    RegulatoryReportingService,
    TransactionMonitorService,
  ],
  controllers: [TransactionController, TransactionWebhookController],
  exports: [TransactionService],
})
export class TransactionsModule {}
