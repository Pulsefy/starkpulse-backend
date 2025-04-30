import { Injectable } from "@nestjs/common";

// rpc/monitoring/rpc-monitoring.service.ts
@Injectable()
export class RpcMonitoringService {
  private metrics: any[] = [];

  logMetric(type: string, value: any) {
    this.metrics.push({ type, value, timestamp: Date.now() });
    console.log(`[METRIC] ${type}:`, value);
  }

  getAllMetrics() {
    return this.metrics;
  }
}
