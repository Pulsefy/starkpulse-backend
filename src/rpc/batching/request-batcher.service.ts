import { Injectable } from "@nestjs/common";

// rpc/batching/request-batcher.service.ts
@Injectable()
export class RequestBatcherService {
  private batch: any[] = [];
  private readonly maxBatchSize = 10;

  addToBatch(request: any) {
    this.batch.push(request);
    if (this.batch.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  private flush() {
    // Send batch to RPC
    console.log('Sending batched requests:', this.batch);
    this.batch = [];
  }
}
