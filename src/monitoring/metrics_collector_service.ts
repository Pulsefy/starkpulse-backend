import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { MetricsService } from './metrics-service';

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private collectionHistory: Array<{
    timestamp: string;
    duration: number;
    success: boolean;
    error?: string;
  }> = [];

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly metricsService: MetricsService,
  ) {}

  async collectAll(): Promise<void> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      await Promise.all([
        this.collectSystemMetrics(),
        this.collectDatabaseMetrics(),
        this.collectApplicationMetrics(),
        this.collectBusinessMetrics(),
      ]);

      this.logger.debug('All metrics collected successfully');
    } catch (err) {
      success = false;
      error = err.message;
      this.logger.error('Failed to collect some metrics:', err);
    } finally {
      const duration = Date.now() - startTime;
      this.collectionHistory.unshift({
        timestamp: new Date().toISOString(),
        duration,
        success,
        error,
      });

      // Keep only last 100 entries
      if (this.collectionHistory.length > 100) {
        this.collectionHistory = this.collectionHistory.slice(0, 100);
      }
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Memory metrics
      this.metricsService.updateMemoryMetrics();

      // Process metrics
      const processMetrics = this.getProcessMetrics();
      this.logger.debug('Process metrics collected', processMetrics);

      // OS metrics
      const osMetrics = await this.getOSMetrics();
      this.logger.debug('OS metrics collected', osMetrics);

    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error);
      throw error;
    }
  }

  private async collectDatabaseMetrics(): Promise<void> {
    try {
      await this.metricsService.updateDatabaseMetrics();
      
      // Additional database metrics
      const dbMetrics = await this.getDetailedDatabaseMetrics();
      this.logger.debug('Database metrics collected', dbMetrics);

    } catch (error) {
      this.logger.error('Failed to collect database metrics:', error);
      throw error;
    }
  }

  private async collectApplicationMetrics(): Promise<void> {
    try {
      // Application-specific metrics
      const appMetrics = {
        uptime: process.uptime(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      };

      this.logger.debug('Application metrics collected', appMetrics);
    } catch (error) {
      this.logger.error('Failed to collect application metrics:', error);
      throw error;
    }
  }

  private async collectBusinessMetrics(): Promise<void> {
    try {
      // Collect business-specific metrics
      const businessMetrics = await this.metricsService.getBusinessMetrics();
      this.logger.debug('Business metrics collected', businessMetrics);
    } catch (error) {
      this.logger.error('Failed to collect business metrics:', error);
      // Don't throw here as business metrics might not be critical
    }
  }

  private getProcessMetrics(): Record<string, any> {
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
      pid: process.pid,
    };
  }

  private async getOSMetrics(): Promise<Record<string, any>> {
    try {
      const os = require('os');
      
      return {
        loadAverage: os.loadavg(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        platform: os.platform(),
        uptime: os.uptime(),
      };
    } catch (error) {
      this.logger.warn('Could not collect OS metrics:', error);
      return {};
    }
  }

  private async getDetailedDatabaseMetrics(): Promise<Record<string, any>> {
    try {
      if (!this.connection.isConnected) {
        return { connected: false };
      }

      // Database-specific metrics (PostgreSQL)
      const queries = [
        {
          name: 'connections',
          query: `
            SELECT count(*) as total_connections,
                   count(CASE WHEN state = 'active' THEN 1 END) as active_connections,
                   count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
            FROM pg_stat_activity
            WHERE datname = current_database()
          `,
        },
        {
          name: 'database_size',
          query: `
            SELECT pg_database_size(current_database()) as size_bytes,
                   pg_size_pretty(pg_database_size(current_database())) as size_pretty
          `,
        },
        {
          name: 'table_stats',
          query: `
            SELECT COUNT(*) as table_count,
                   SUM(n_tup_ins) as total_inserts,
                   SUM(n_tup_upd) as total_updates,
                   SUM(n_tup_del) as total_deletes
            FROM pg_stat_user_tables
          `,
        },
      ];

      const results = {};
      for (const { name, query } of queries) {
        try {
          const result = await this.connection.query(query);
          results[name] = result[0] || {};
        } catch (error) {
          this.logger.warn(`Failed to execute ${name} query:`, error);
          results[name] = { error: error.message };
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to get detailed database metrics:', error);
      return { error: error.message };
    }
  }

  // Collector management methods
  getCollectionHistory(): Array<{
    timestamp: string;
    duration: number;
    success: boolean;
    error?: string;
  }> {
    return [...this.collectionHistory];
  }

  getCollectionStats(): {
    totalCollections: number;
    successfulCollections: number;
    failedCollections: number;
    averageDuration: number;
    lastCollection?: {
      timestamp: string;
      duration: number;
      success: boolean;
    };
  } {
    const total = this.collectionHistory.length;
    const successful = this.collectionHistory.filter(h => h.success).length;
    const failed = total - successful;
    const averageDuration = total > 0 
      ? this.collectionHistory.reduce((sum, h) => sum + h.duration, 0) / total 
      : 0;

    return {
      totalCollections: total,
      successfulCollections: successful,
      failedCollections: failed,
      averageDuration: Math.round(averageDuration * 100) / 100,
      lastCollection: this.collectionHistory[0],
    };
  }

  clearHistory(): void {
    this.collectionHistory = [];
    this.logger.log('Collection history cleared');
  }

  // Manual collection methods
  async collectSystemMetricsOnly(): Promise<Record<string, any>> {
    await this.collectSystemMetrics();
    return this.getProcessMetrics();
  }

  async collectDatabaseMetricsOnly(): Promise<Record<string, any>> {
    await this.collectDatabaseMetrics();
    return this.getDetailedDatabaseMetrics();
  }

  async forceCollection(): Promise<void> {
    this.logger.log('Forcing metrics collection');
    await this.collectAll();
  }
}