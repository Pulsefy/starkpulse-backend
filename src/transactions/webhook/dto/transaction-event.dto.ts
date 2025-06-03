export class TransactionEventDto {
  transactionId: string;
  status: string;
  previousStatus?: string;
  timestamp: number;
  blockNumber?: number;
  hash?: string;
  error?: string;
  metadata?: any;
}
