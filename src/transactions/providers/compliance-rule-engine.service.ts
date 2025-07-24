// @ts-ignore: Cannot find module '@nestjs/common' or its corresponding type declarations.
import { Injectable } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';

export interface ComplianceRule {
  id: string;
  description: string;
  check: (tx: Transaction) => boolean;
  severity: 'low' | 'medium' | 'high';
}

@Injectable()
export class ComplianceRuleEngineService {
  private rules: ComplianceRule[] = [
    {
      id: 'high-value',
      description: 'Transaction value exceeds $10,000',
      check: (tx) => Number(tx.value) > 10000,
      severity: 'high',
    },
    {
      id: 'to-blacklisted',
      description: 'Transaction to blacklisted address',
      check: (tx) => this.blacklistedAddresses.includes(tx.toAddress),
      severity: 'high',
    },
  ];

  private blacklistedAddresses: string[] = [];

  setBlacklistedAddresses(addresses: string[]) {
    this.blacklistedAddresses = addresses;
  }

  evaluate(tx: Transaction): { ruleId: string; description: string; severity: string }[] {
    return this.rules
      .filter((rule) => rule.check(tx))
      .map((rule) => ({ ruleId: rule.id, description: rule.description, severity: rule.severity }));
  }
} 