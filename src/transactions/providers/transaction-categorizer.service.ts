import { Injectable } from "@nestjs/common";
import { TransactionType } from "../enums/transactionType.enum";
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class TransactionCategorizerService {
  categorize(tx: Transaction): TransactionType {
    if (tx.toAddress === '0x...stakingContract') return TransactionType.STAKE;
    if (tx.method?.includes('swap')) return TransactionType.SWAP;
    return TransactionType.TRANSFER;
  }
}
