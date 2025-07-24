// @ts-ignore: Cannot find module '@nestjs/common' or its corresponding type declarations.
import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class RegulatoryReportingService {
  generateCsvReport(transactions: Transaction[]): string {
    const header = 'TransactionHash,From,To,Value,Status,Type,FlaggedReasons\n';
    const rows = transactions.map(tx =>
      [
        tx.transactionHash,
        tx.fromAddress,
        tx.toAddress,
        tx.value,
        tx.status,
        tx.type,
        (tx.metadata?.flaggedReasons || []).join(';')
      ].join(',')
    );
    return header + rows.join('\n');
  }
} 