import { Injectable, Logger } from '@nestjs/common';

interface BatcherRequest {
  method: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  priority: number;
}

@Injectable()
export class BatcherService {
  private readonly logger = new Logger(BatcherService.name);
  private queue: BatcherRequest[] = [];
  private batchingWindowMs = 10; 
  private batchingTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly rpcConnection: {
      batchCall: (requests: { method: string; params: any[] }[]) => Promise<any[]>;
    },
  ) {}

  /**
   * Enqueue a request with priority into the batch queue
   */
  async enqueueRequest(method: string, params: any[], priority = 5): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: BatcherRequest = { method, params, resolve, reject, priority };
      this.queue.push(request);
      this.logger.debug(`Enqueued RPC request: ${method} with priority ${priority}`);
      this.scheduleBatch();
    });
  }

  /**
   * Schedule batching after a short window
   */
  private scheduleBatch(): void {
    if (!this.batchingTimer) {
      this.batchingTimer = setTimeout(() => this.flushQueue(), this.batchingWindowMs);
    }
  }

  /**
   * Flush the queue and send batched RPC requests
   */
  private async flushQueue(): Promise<void> {
    const queueSnapshot = [...this.queue];
    this.queue = [];
    this.batchingTimer = null;

    if (queueSnapshot.length === 0) {
      return;
    }

    // Sort requests by priority (lower number = higher priority)
    queueSnapshot.sort((a, b) => a.priority - b.priority);

    try {
      const batchedRequests = queueSnapshot.map(req => ({
        method: req.method,
        params: req.params,
      }));

      const results = await this.rpcConnection.batchCall(batchedRequests);

      for (let i = 0; i < queueSnapshot.length; i++) {
        queueSnapshot[i].resolve(results[i]);
      }

      this.logger.debug(`Flushed ${queueSnapshot.length} RPC requests`);
    } catch (error) {
      this.logger.error('Batch RPC call failed', error);
      for (const req of queueSnapshot) {
        req.reject(error);
      }
    }
  }
}
