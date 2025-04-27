import { Injectable, Logger } from '@nestjs/common';
import { RpcConfig } from 'src/config/rpc.config';

// Simple Priority Enum
export enum RequestPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

interface QueuedRequest {
  payload: any;
  priority: RequestPriority;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

@Injectable()
export class BatcherService {
  private readonly logger = new Logger(BatcherService.name);
  private queue: QueuedRequest[] = [];
  private timer: NodeJS.Timeout;

  constructor() {
    this.startBatching();
  }

  private startBatching() {
    this.timer = setInterval(() => this.flushQueue(), RpcConfig.BATCHING.batchingWindowMs);
  }

  private async flushQueue() {
    if (this.queue.length === 0) return;

    // Sort the queue by priority (lower number = higher priority)
    const sortedQueue = [...this.queue].sort((a, b) => a.priority - b.priority);
    this.queue = []; // Clear queue before sending

    const payloads = sortedQueue.map(q => q.payload);

    try {
      const responses = await this.sendBatchRequest(payloads);

      responses.forEach((response, idx) => {
        sortedQueue[idx].resolve(response);
      });
    } catch (error) {
      this.logger.error('Batch request failed', error);
      sortedQueue.forEach(req => req.reject(error));
    }
  }

  private async sendBatchRequest(payloads: any[]) {
    // TODO: Replace with your real batch RPC sending logic
    return payloads.map(p => ({ success: true, data: p }));
  }

  addRequest(payload: any, priority: RequestPriority = RequestPriority.NORMAL): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, priority, resolve, reject });
    });
  }
}
