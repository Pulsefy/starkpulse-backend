import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseService } from '../database.service';

export interface DatabaseHealthMetrics {
  connectionPool: {
    active: number;
    idle: number;
    waiting: number;
  };
  queryPerformance: {
    averageResponseTime: number;
    slowQueries: number;
    totalQueries: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);
  private queryMetrics: { responseTime: number; timestamp: Date }[] = [];
  private slowQueryThreshold = 1000; // 1 second

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly databaseService: DatabaseService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorHealth(): Promise<void> {
    try {
      const metrics = await this.getHealthMetrics();
      this.logHealthMetrics(metrics);

      // Alert on issues
      if (metrics.connectionPool.waiting > 5) {
        this.logger.warn('High connection pool waiting count detected');
      }

      if (
        metrics.queryPerformance.averageResponseTime > this.slowQueryThreshold
      ) {
        this.logger.warn('High average query response time detected');
      }
    } catch (error) {
      this.logger.error('Health monitoring failed', error);
    }
  }

  async getHealthMetrics(): Promise<DatabaseHealthMetrics> {
    const connectionPool = await this.databaseService.getConnectionPoolStatus();

    // Calculate query performance metrics
    const recentMetrics = this.queryMetrics.filter(
      (m) => Date.now() - m.timestamp.getTime() < 60000, // Last minute
    );

    const averageResponseTime =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
          recentMetrics.length
        : 0;

    const slowQueries = recentMetrics.filter(
      (m) => m.responseTime > this.slowQueryThreshold,
    ).length;

    const memoryUsage = process.memoryUsage();

    return {
      connectionPool,
      queryPerformance: {
        averageResponseTime,
        slowQueries,
        totalQueries: recentMetrics.length,
      },
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
      },
    };
  }

  recordQueryMetric(responseTime: number): void {
    this.queryMetrics.push({
      responseTime,
      timestamp: new Date(),
    });

    // Keep only last 1000 metrics to prevent memory leak
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  private logHealthMetrics(metrics: DatabaseHealthMetrics): void {
    this.logger.log(
      `Database Health - Pool: Active=${metrics.connectionPool.active}, Idle=${metrics.connectionPool.idle}, Waiting=${metrics.connectionPool.waiting}`,
    );
    this.logger.log(
      `Query Performance - Avg: ${metrics.queryPerformance.averageResponseTime.toFixed(2)}ms, Slow: ${metrics.queryPerformance.slowQueries}, Total: ${metrics.queryPerformance.totalQueries}`,
    );
  }
}
