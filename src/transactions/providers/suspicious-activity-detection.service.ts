// @ts-ignore: Cannot find module '@nestjs/common' or its corresponding type declarations.
import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../enums/transactionType.enum';

@Injectable()
export class SuspiciousActivityDetectionService {
  detectAnomalies(tx: Transaction): string[] {
    const anomalies: string[] = [];
    if (Number(tx.value) > 50000) anomalies.push('very_high_value');
    if (tx.status === 'FAILED' && tx.retries > 3) anomalies.push('repeated_failures');
    if (tx.type === TransactionType.OTHER) anomalies.push('unknown_function');
    // ML model stub: integrate here
    return anomalies;
  }
} 