// ZK transaction verification using StarkNet proofs
import { Injectable } from '@nestjs/common';
import { ZKService, ZKProof } from '../zk/zk.service';

@Injectable()
export class ZKTransactionService {
  constructor(private readonly zkService: ZKService) {}

  async verifyTransaction(transactionData: any): Promise<boolean> {
    // Generate and verify ZK proof for transaction
    const proof: ZKProof = await this.zkService.generateProof(transactionData);
    return this.zkService.verifyProof(proof);
  }
}
