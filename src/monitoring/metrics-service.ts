import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Connection } from 'typeorm';
import { Counter, Histogram, Gauge, Summary } from 'prom-client';
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_ms')
    private readonly httpRequestDuration: Histogram<string>,
    @InjectMetric('database_connections_active')
    private readonly dbConnectionsGauge: Gauge<string>,
    @InjectMetric('memory_usage_bytes')
    private readonly memoryUsageGauge: Gauge<string>,
    @InjectMetric('business_operations_total')
    private readonly businessOperationsCounter: Counter<string>,
    @InjectMetric('error_rate')
    private readonly errorRateGauge: Gauge<string>,
  ) {}

  // HTTP Metrics
  incrementHttpRequests(method: string, route: string, statusCode: string): void {
    this.httpRequestsCounter.inc({
      method,
      route,
      status_code: statusCode,
    });
  }

  recordHttpRequestDuration(
    method: string,
    route: string,
    statusCode: string,
    duration: number,
  ): void {
    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      duration,
    );
  }

  // Database Metrics
  async updateDatabaseMetrics(): Promise<void> {
    try {
      // Update active connections
      const activeConnections = this.connection.isConnected ? 1 : 0;
      this.dbConnectionsGauge.set(activeConnections);

      // You can extend this to get actual connection pool metrics
      // if using a connection pool
    } catch (error) {
      this.logger.error('Failed to update database metrics:', error);
    }
  }

  // Memory Metrics
  updateMemoryMetrics(): void {
    const memoryUsage = process.memoryUsage();
    this.memoryUsageGauge.set({ type: 'heap_used' }, memoryUsage.heapUsed);
    this.memoryUsageGauge.set({ type: 'heap_total' }, memoryUsage.heapTotal);
    this.memoryUsageGauge.set({ type: 'rss' }, memoryUsage.rss);
    this.memoryUsageGauge.set({ type: 'external' }, memoryUsage.external);
  }

  // Business Metrics
  incrementBusinessOperation(operation: string, success: boolean): void {
    this.businessOperationsCounter.inc({
      operation,
      success: success.toString(),
    });
  }

  // Error Metrics
  updateErrorRate(rate: number): void {
    this.errorRateGauge.set(rate);
  }

  // Custom Metrics Collection
  async getCustomMetrics(): Promise<Record<string, any>> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }

  async getPerformanceMetrics(): Promise<Record<string, any>> {
    const startTime = Date.now();
    
    // Database response time
    let dbResponseTime = 0;
    try {
      const dbStart = Date.now();
      await this.connection.query('SELECT 1');
      dbResponseTime = Date.now() - dbStart;
    } catch (error) {
      this.logger.error('Database performance check failed:', error);
    }

    return {
      database: {
        responseTime: dbResponseTime,
        isConnected: this.connection.isConnected,
      },
      application: {
        responseTime: Date.now() - startTime,
        uptime: process.uptime(),
      },
    };
  }

  async getBusinessMetrics(): Promise<Record<string, any>> {
    try {
      // Example business metrics - customize based on your application
      const userCount = await this.connection.query(
        'SELECT COUNT(*) as count FROM users',
      );
      
      const orderCount = await this.connection.query(
        'SELECT COUNT(*) as count FROM orders WHERE created_at >= NOW() - INTERVAL \'24 hours\'',
      );

      return {
        users: {
          total: parseInt(userCount[0]?.count || '0'),
        },
        orders: {
          last24Hours: parseInt(orderCount[0]?.count || '0'),
        },
        // Add more business-specific metrics here
      };
    } catch (error) {
      this.logger.error('Failed to collect business metrics:', error);
      return {
        error: 'Failed to collect business metrics',
      };
    }
  }

  // Metric aggregation helpers
  async getMetricsSummary(): Promise<Record<string, any>> {
    const [custom, performance, business] = await Promise.all([
      this.getCustomMetrics(),
      this.getPerformanceMetrics(),
      this.getBusinessMetrics(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      custom,
      performance,
      business,
    };
  }

  // Reset metrics (useful for testing or periodic cleanup)
  resetMetrics(): void {
    this.httpRequestsCounter.reset();
    this.httpRequestDuration.reset();
    this.businessOperationsCounter.reset();
    this.logger.log('Metrics have been reset');
  }
}