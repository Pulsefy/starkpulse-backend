import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class CustomHealthIndicator extends HealthIndicator {
  private readonly startTime: number;

  constructor() {
    super();
    this.startTime = Date.now();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const checks = {
      liveness: () => this.checkLiveness(),
      readiness: () => this.checkReadiness(),
      application: () => this.checkApplication(),
    };

    const checkFunction = checks[key] || checks.application;
    return checkFunction();
  }

  private async checkLiveness(): Promise<HealthIndicatorResult> {
    const key = 'liveness';

    try {
      // Basic liveness check - application is running
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      const isHealthy = uptime > 0 && memoryUsage.heapUsed > 0;

      return this.getStatus(key, isHealthy, {
        uptime,
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HealthCheckError(
        'Liveness check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  private async checkReadiness(): Promise<HealthIndicatorResult> {
    const key = 'readiness';

    try {
      // Check if application is ready to serve requests
      const uptime = process.uptime();
      const isReady = uptime > 5; // Ready after 5 seconds

      return this.getStatus(key, isReady, {
        uptime,
        status: isReady ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HealthCheckError(
        'Readiness check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  private async checkApplication(): Promise<HealthIndicatorResult> {
    const key = 'application';

    try {
      // Application-specific health checks
      const memoryUsage = process.memoryUsage();
      const isHealthy = memoryUsage.heapUsed < memoryUsage.heapTotal * 0.9;

      return this.getStatus(key, isHealthy, {
        memoryUsage: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HealthCheckError(
        'Application check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }
}
