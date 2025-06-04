import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HealthService } from './health-service';
import { MetricsService } from './metrics-service';
import { AlertingService } from './alerting-service';
import { MetricsCollectorService } from './metrics_collector_service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly thresholds = {
    errorRate: 5, // 5%
    responseTime: 2000, // 2 seconds
    memoryUsage: 85, // 85%
    diskUsage: 90, // 90%
    dbResponseTime: 1000, // 1 second
  };

  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
    private readonly metricsCollectorService: MetricsCollectorService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async collectMetrics(): Promise<void> {
    try {
      this.logger.debug('Collecting system metrics');
      
      // Update system metrics
      this.metricsService.updateMemoryMetrics();
      await this.metricsService.updateDatabaseMetrics();
      
      // Collect custom metrics
      await this.metricsCollectorService.collectAll();
      
      this.logger.debug('Metrics collection completed');
    } catch (error) {
      this.logger.error('Failed to collect metrics:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlertConditions(): Promise<void> {
    try {
      this.logger.debug('Checking alert conditions');
      
      const metrics = await this.metricsService.getMetricsSummary();
      const performance = metrics.performance;
      const custom = metrics.custom;

      // Check database response time
      if (performance.database.responseTime > this.thresholds.dbResponseTime) {
        await this.alertingService.sendAlert('RESPONSE_TIME_HIGH', {
          component: 'database',
          responseTime: performance.database.responseTime,
          threshold: this.thresholds.dbResponseTime,
        });
      }

      // Check memory usage
      const memoryUsagePercent = (custom.memory.heapUsed / custom.memory.heapTotal) * 100;
      if (memoryUsagePercent > this.thresholds.memoryUsage) {
        await this.alertingService.sendAlert('MEMORY_USAGE_HIGH', {
          usage: Math.round(memoryUsagePercent),
          threshold: this.thresholds.memoryUsage,
          heapUsed: custom.memory.heapUsed,
          heapTotal: custom.memory.heapTotal,
        });
      }

      // Check application response time
      if (performance.application.responseTime > this.thresholds.responseTime) {
        await this.alertingService.sendAlert('RESPONSE_TIME_HIGH', {
          component: 'application',
          responseTime: performance.application.responseTime,
          threshold: this.thresholds.responseTime,
        });
      }

      this.logger.debug('Alert conditions check completed');
    } catch (error) {
      this.logger.error('Failed to check alert conditions:', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck(): Promise<void> {
    try {
      this.logger.debug('Performing comprehensive health check');
      await this.healthService.checkOverallHealth();
      this.logger.debug('Health check completed');
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData(): Promise<void> {
    try {
      this.logger.debug('Cleaning up old monitoring data');
      
      // Clear resolved alerts older than 24 hours
      const clearedAlerts = this.alertingService.clearResolvedAlerts();
      this.logger.log(`Cleared ${clearedAlerts} resolved alerts`);
      
      // Reset some metrics to prevent memory leaks
      // This is optional and depends on your specific needs
      
      this.logger.debug('Cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old data:', error);
    }
  }

  // Manual monitoring operations
  async getMonitoringDashboard(): Promise<{
    health: any;
    metrics: any;
    alerts: any;
    timestamp: string;
  }> {
    const [health, metrics, activeAlerts] = await Promise.all([
      this.healthService.getHealthSummary(),
      this.metricsService.getMetricsSummary(),
      this.alertingService.getActiveAlerts(),
    ]);

    return {
      health,
      metrics,
      alerts: {
        active: activeAlerts,
        count: activeAlerts.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async triggerEmergencyCheck(): Promise<void> {
    this.logger.warn('Emergency monitoring check triggered');
    
    await Promise.allSettled([
      this.performHealthCheck(),
      this.collectMetrics(),
      this.checkAlertConditions(),
    ]);
  }

  // Configuration and management
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    Object.assign(this.thresholds, newThresholds);
    this.logger.log('Monitoring thresholds updated', { thresholds: this.thresholds });
  }

  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds };
  }

  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    version: string;
    environment: string;
    lastCheck: string;
  }> {
    const health = await this.healthService.checkOverallHealth();
    
    return {
      status: health.status,
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      lastCheck: health.timestamp,
    };
  }

  // Testing and validation
  async validateMonitoringSetup(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Test health check
      await this.healthService.checkOverallHealth();
    } catch (error) {
      issues.push('Health check system is not working properly');
    }

    try {
      // Test metrics collection
      await this.metricsService.getMetricsSummary();
    } catch (error) {
      issues.push('Metrics collection is not working properly');
    }

    try {
      // Test alerting system
      await this.alertingService.sendTestAlert();
    } catch (error) {
      issues.push('Alerting system is not configured properly');
    }

    // Check configuration
    if (!process.env.SLACK_WEBHOOK_URL && !process.env.DISCORD_WEBHOOK_URL && !process.env.ALERT_WEBHOOK_URL) {
      recommendations.push('Configure at least one alerting channel (Slack, Discord, or webhook)');
    }

    if (!process.env.SMTP_HOST) {
      recommendations.push('Configure SMTP settings for email alerts');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}