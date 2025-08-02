import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitMetrics {
  userId?: number;
  key: string;
  bucketSize: number;
  refillRate: number;
  tokensLeft: number;
  lastRequestTime: Date;
  deniedRequests: number;
  totalRequests: number;
  systemCpuLoad: number;
  systemMemoryLoad: number;
  adaptiveMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RateLimitMetricsStore {
  private readonly logger = new Logger(RateLimitMetricsStore.name);
  private readonly metrics = new Map<string, RateLimitMetrics>();
  private readonly maxMetricsSize = 10000;

  async recordMetrics(
    key: string,
    metrics: Partial<RateLimitMetrics>,
    systemMetrics: { cpuUsage: number; memoryUsage: number; adaptiveMultiplier: number }
  ): Promise<void> {
    try {
      const existing = this.metrics.get(key);
      const now = new Date();

      const updatedMetrics: RateLimitMetrics = {
        ...existing,
        ...metrics,
        key: key, // Ensure key is always set
        systemCpuLoad: systemMetrics.cpuUsage,
        systemMemoryLoad: systemMetrics.memoryUsage,
        adaptiveMultiplier: systemMetrics.adaptiveMultiplier,
        updatedAt: now,
        createdAt: existing?.createdAt || now,
      };

      this.metrics.set(key, updatedMetrics);

      if (this.metrics.size > this.maxMetricsSize) {
        this.cleanupOldMetrics();
      }
    } catch (error) {
      this.logger.error(`Failed to record metrics for key ${key}:`, error);
    }
  }

  async getMetricsByUserId(userId: number): Promise<RateLimitMetrics[]> {
    const userMetrics: RateLimitMetrics[] = [];
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.userId === userId || key.includes(`user:${userId}`)) {
        userMetrics.push(metrics);
      }
    }

    return userMetrics.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getAllMetrics(): Promise<RateLimitMetrics[]> {
    return Array.from(this.metrics.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getMetricsByKey(key: string): Promise<RateLimitMetrics | null> {
    return this.metrics.get(key) || null;
  }

  async getSystemMetrics(): Promise<{
    totalUsers: number;
    totalRequests: number;
    totalDeniedRequests: number;
    averageCpuLoad: number;
    averageMemoryLoad: number;
    averageAdaptiveMultiplier: number;
  }> {
    const metrics = Array.from(this.metrics.values());
    
    if (metrics.length === 0) {
      return {
        totalUsers: 0,
        totalRequests: 0,
        totalDeniedRequests: 0,
        averageCpuLoad: 0,
        averageMemoryLoad: 0,
        averageAdaptiveMultiplier: 1.0,
      };
    }

    const uniqueUsers = new Set(metrics.map(m => m.userId).filter(Boolean));
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalDeniedRequests = metrics.reduce((sum, m) => sum + m.deniedRequests, 0);
    const averageCpuLoad = metrics.reduce((sum, m) => sum + m.systemCpuLoad, 0) / metrics.length;
    const averageMemoryLoad = metrics.reduce((sum, m) => sum + m.systemMemoryLoad, 0) / metrics.length;
    const averageAdaptiveMultiplier = metrics.reduce((sum, m) => sum + m.adaptiveMultiplier, 0) / metrics.length;

    return {
      totalUsers: uniqueUsers.size,
      totalRequests,
      totalDeniedRequests,
      averageCpuLoad,
      averageMemoryLoad,
      averageAdaptiveMultiplier,
    };
  }

  async cleanupOldMetrics(): Promise<void> {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, metrics] of this.metrics.entries()) {
      if (now - metrics.updatedAt.getTime() > maxAge) {
        this.metrics.delete(key);
      }
    }

    this.logger.debug(`Cleaned up old metrics, remaining: ${this.metrics.size}`);
  }

  async reset(): Promise<void> {
    this.metrics.clear();
    this.logger.log('Rate limit metrics store reset');
  }
} 