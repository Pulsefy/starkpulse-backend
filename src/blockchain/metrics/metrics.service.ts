// 🔧 blockchain/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private processedEvents = 0;
  private startTime = Date.now();

  incrementProcessed(count: number) {
    this.processedEvents += count;
  }

  getCurrentStats() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      eventsPerSecond: (this.processedEvents / elapsed).toFixed(2),
      memoryUsage: process.memoryUsage(),
    };
  }
}