import { Injectable } from "@nestjs/common";
import { PriorityQueue } from "src/common/utils/prirority-queue";

// rpc/queue/request-queue.service.ts
@Injectable()
export class RequestQueueService {
  private queue = new PriorityQueue<{ rpcData: any }>();

  addToQueue(request: any, priority = 5) {
    this.queue.enqueue({ rpcData: request }, priority);
  }

  processQueue() {
    const next = this.queue.dequeue();
    if (next) {
      // Forward to batcher or RPC
    }
  }
}
