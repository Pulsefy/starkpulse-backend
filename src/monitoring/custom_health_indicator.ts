import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

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
      throw new HealthCheckError('Liveness check failed', 
        this.getStatus(key, false, { error: error.message })
      );
    }
  }

  private async checkReadiness(): Promise<HealthIndicatorResult> {
    const key = 'readiness';
    
    try {
      // Check if application is ready to serve traffic
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      // Application is ready if memory usage is not critical
      const isReady = memoryUsagePercent < 95;
      
      return this.getStatus(key, isReady, {
        memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
        heapUsedMB: Math.round(heapUsedMB * 100) / 100,
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HealthCheckError('Readiness check failed',
        this.getStatus(key, false, { error: error.message })
      );
    }
  }

  private async checkApplication(): Promise<HealthIndicatorResult> {
    const key = 'application';
    
    try {
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Check various application health indicators
      const checks = {
        uptime: uptime > 0,
        memory: memoryUsage.heapUsed > 0,
        cpu: cpuUsage.user > 0 || cpuUsage.system > 0,
      };
      
      const isHealthy = Object.values(checks).every(Boolean);
      
      return this.getStatus(key, isHealthy, {
        uptime,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
          rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        checks,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HealthCheckError('Application health check failed',
        this.getStatus(key, false, { error: error.message })
      );
    }
  }

  async checkStartupTime(): Promise<HealthIndicatorResult> {
    const key = 'startup_time';
    const currentTime = Date.now();
    const startupTime = currentTime - this.startTime;
    
    // Consider startup healthy if it took less than 30 seconds
    const isHealthy = startupTime < 30000;
    
    return this.getStatus(key, isHealthy, {
      startupTimeMs: startupTime,
      startupTimeSeconds: Math.round(startupTime / 1000 * 100) / 100,
      startedAt: new Date(this.startTime).toISOString(),
      threshold: '30 seconds',
    });
  }

  async checkEnvironment(): Promise<HealthIndicatorResult> {
    const key = 'environment';
    
    try {
      const requiredEnvVars = [
        'NODE_ENV',
        'DATABASE_URL',
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      const isHealthy = missingVars.length === 0;
      
      return this.getStatus(key, isHealthy, {
        nodeEnv: process.env.NODE_ENV,
        missingVariables: missingVars,
        allVariablesPresent: isHealthy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HealthCheckError('Environment check failed',
        this.getStatus(key, false, { error: error.message })
      );
    }
  }
}