import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import {
  HealthCheckResult,
  ServiceCheck,
  ServiceStatus,
} from './interfaces/health-check.interface';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private connection: Connection) {}

  async check(): Promise<HealthCheckResult> {
    const dbStatus = await this.checkDatabase();

    const status: ServiceStatus =
      dbStatus.status === 'up' ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
      },
      info: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }

  private async checkDatabase(): Promise<ServiceCheck> {
    try {
      await this.connection.query('SELECT 1');
      return { status: 'up' }; // Explicitly setting status to 'up'
    } catch (error) {
      return {
        status: 'down',
        error: error.message, // Explicitly setting status to 'down'
      };
    }
  }
}
