import { Injectable } from '@nestjs/common';
import { ConnectionPoolService } from '../connection-pool/connection-pool.service';
import { BatcherService } from '../batching/batcher.service';
import { CacheService } from '../caching/cache.service';
import { RateLimiterService } from '../rate-limiter/rate-limiter.service';
import { MonitoringService } from '../monitoring/monitoring.service';

export enum RequestPriority {
  HIGH = 1,
  NORMAL = 5,
  LOW = 10,
}

@Injectable()
export class RpcService {
  constructor(
    private readonly connectionPool: ConnectionPoolService,
    private readonly batcher: BatcherService,
    private readonly cache: CacheService,
    private readonly rateLimiter: RateLimiterService,
    private readonly monitoring: MonitoringService,
  ) {}

  async callRpcMethod(
    method: string,
    params: any[],
    priority: RequestPriority = RequestPriority.NORMAL, // default priority is normal
  ): Promise<any> {
    const cacheKey = `${method}:${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.cache.get<any>(cacheKey);
    if (cached) {
      this.monitoring.recordCacheHit();
      return cached;
    }
    this.monitoring.recordCacheMiss();

    const start = Date.now();
    try {
      const result = await this.rateLimiter.schedule(() =>
        this.batcher.enqueueRequest(method, params, priority) // 👈 use enqueueRequest correctly
      );
      
      const latency = Date.now() - start;
      this.monitoring.recordRequest(latency, true);
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      const latency = Date.now() - start;
      this.monitoring.recordRequest(latency, false);
      throw error;
    }
  }
}
