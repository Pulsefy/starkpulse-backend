import { Injectable } from '@nestjs/common';

@Injectable()
export class MonitoringService {
  private metrics = {
    totalRequests: 0,
    totalFailures: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLatencyMs: 0,
  };

  recordRequest(latencyMs: number, success: boolean): void {
    this.metrics.totalRequests += 1;
    if (!success) {
      this.metrics.totalFailures += 1;
    }
    this.metrics.averageLatencyMs =
      (this.metrics.averageLatencyMs * (this.metrics.totalRequests - 1) + latencyMs) / this.metrics.totalRequests;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses += 1;
  }

  getMetrics() {
    return this.metrics;
  }
}
