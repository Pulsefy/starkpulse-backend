import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertingService } from './alerting-service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  details: Record<string, any>;
}

export interface ComponentHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private healthHistory: HealthStatus[] = [];
  private readonly maxHistorySize = 100;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly alertingService: AlertingService,
  ) {}

  async checkOverallHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const components: ComponentHealth[] = [];

    try {
      // Check database
      const dbHealth = await this.checkDatabaseHealth();
      components.push(dbHealth);

      // Check memory usage
      const memoryHealth = await this.checkMemoryHealth();
      components.push(memoryHealth);

      // Check disk usage
      const diskHealth = await this.checkDiskHealth();
      components.push(diskHealth);

      // Determine overall status
      const hasDown = components.some(c => c.status === 'down');
      const hasDegraded = components.some(c => c.status === 'degraded');

      let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
      if (hasDown) {
        overallStatus = 'unhealthy';
      } else if (hasDegraded) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        details: {
          components,
          responseTime: Date.now() - startTime,
          uptime: process.uptime(),
        },
      };

      // Store in history
      this.addToHistory(healthStatus);

      // Check for alerts
      await this.checkHealthAlerts(healthStatus);

      return healthStatus;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          error: error.message,
          components,
        },
      };

      this.addToHistory(unhealthyStatus);
      await this.alertingService.sendAlert('HEALTH_CHECK_FAILED', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      return unhealthyStatus;
    }
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      await this.connection.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        name: 'database',
        status: responseTime > 1000 ? 'degraded' : 'up',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async checkMemoryHealth(): Promise<ComponentHealth> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: 'up' | 'down' | 'degraded';
    if (usagePercent > 90) {
      status = 'down';
    } else if (usagePercent > 80) {
      status = 'degraded';
    } else {
      status = 'up';
    }

    return {
      name: 'memory',
      status,
      lastCheck: new Date().toISOString(),
    };
  }

  private async checkDiskHealth(): Promise<ComponentHealth> {
    // Simple disk check - in production, you might want to use a more sophisticated approach
    try {
      const fs = require('fs');
      const stats = fs.statSync('/');
      
      return {
        name: 'disk',
        status: 'up',
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'down',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private addToHistory(status: HealthStatus): void {
    this.healthHistory.unshift(status);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(0, this.maxHistorySize);
    }
  }

  private async checkHealthAlerts(status: HealthStatus): Promise<void> {
    if (status.status === 'unhealthy') {
      await this.alertingService.sendAlert('SYSTEM_UNHEALTHY', {
        status: status.status,
        details: status.details,
        timestamp: status.timestamp,
      });
    } else if (status.status === 'degraded') {
      await this.alertingService.sendAlert('SYSTEM_DEGRADED', {
        status: status.status,
        details: status.details,
        timestamp: status.timestamp,
      });
    }
  }

  getHealthHistory(): HealthStatus[] {
    return [...this.healthHistory];
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async performScheduledHealthCheck(): Promise<void> {
    this.logger.debug('Performing scheduled health check');
    await this.checkOverallHealth();
  }

  async getHealthSummary(): Promise<{
    current: HealthStatus;
    history: HealthStatus[];
    uptime: number;
  }> {
    const current = await this.checkOverallHealth();
    return {
      current,
      history: this.getHealthHistory().slice(0, 10), // Last 10 checks
      uptime: process.uptime(),
    };
  }
}