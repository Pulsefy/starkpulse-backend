// @ts-ignore: Cannot find module '@nestjs/common' or its corresponding type declarations.
import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../enums/transactionType.enum';
import axios from 'axios';

@Injectable()
export class SuspiciousActivityDetectionService {
  async detectAnomalies(tx: Transaction): Promise<string[]> {
    const anomalies: string[] = [];
    // ML-based detection
    try {
      const response = await axios.post('http://localhost:5000/predict', {
        value: tx.value,
        status: tx.status,
        retries: tx.retries,
        type: tx.type,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        // Add more features as needed
      });
      if (response.data && Array.isArray(response.data.anomalies)) {
        anomalies.push(...response.data.anomalies);
      }
    } catch (err) {
      // Fallback to rule-based detection if ML service fails
      if (Number(tx.value) > 50000) anomalies.push('very_high_value');
      if (tx.status === 'FAILED' && tx.retries > 3) anomalies.push('repeated_failures');
      if (tx.type === TransactionType.OTHER) anomalies.push('unknown_function');
    }
    return anomalies;
  }
} 