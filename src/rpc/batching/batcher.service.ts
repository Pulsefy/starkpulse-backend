import { Injectable } from '@nestjs/common';

type RpcRequest = { id: number; method: string; params: any[]; resolve: Function; reject: Function };

@Injectable()
export class BatcherService {
  private queue: RpcRequest[] = [];
  private batchingWindowMs = 10; // adjustable
  private timer: NodeJS.Timeout | undefined;

  constructor() {}

  enqueueRequest(method: string, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id: Date.now(), method, params, resolve, reject });
      this.startTimer();
    });
  }

  private startTimer() {
    if (!this.timer) {
      this.timer = setTimeout(() => this.flushQueue(), this.batchingWindowMs);
    }
  }

  private async flushQueue() {
    const requests = this.queue.splice(0, this.queue.length);
    clearTimeout(this.timer);
    this.timer = undefined;

    // group the batched RPC calls
    const payload = requests.map(r => ({ id: r.id, method: r.method, params: r.params, jsonrpc: '2.0' }));

    try {
      // Send batched payload (inject your ConnectionPoolService here)
      const rawResponse: { id: number; method: string; params: any[]; jsonrpc: string }[] = await /* connectionPoolService.post */ (process.env.RPC_URL, payload);
      const response: { id: number; result: any }[] = rawResponse.map(r => ({ id: r.id, result: r.params[0] })); // Adjust transformation as needed

      for (const res of response) {
        const matchingRequest = requests.find(r => r.id === res.id);
        if (matchingRequest) {
          matchingRequest.resolve(res.result);
        }
      }
    } catch (error) {
      for (const req of requests) {
        req.reject(error);
      }
    }
  }
}
