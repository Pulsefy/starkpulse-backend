import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database-health-indicator';
import { CustomHealthIndicator } from './custom_health_indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private databaseHealth: DatabaseHealthIndicator,
    private customHealth: CustomHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get overall health status' })
  @ApiResponse({ status: 200, description: 'Health check passed' })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9,
      }),
      () => this.databaseHealth.isHealthy('postgres'),
      () => this.customHealth.isHealthy('application'),
    ]);
  }

  @Get('database')
  @ApiOperation({ summary: 'Get database health status' })
  @HealthCheck()
  checkDatabase() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.databaseHealth.isHealthy('postgres_detailed'),
    ]);
  }

  @Get('memory')
  @ApiOperation({ summary: 'Get memory health status' })
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 200 * 1024 * 1024),
    ]);
  }

  @Get('disk')
  @ApiOperation({ summary: 'Get disk health status' })
  @HealthCheck()
  checkDisk() {
    return this.health.check([
      () => this.disk.checkStorage('disk_health', {
        path: '/',
        thresholdPercent: 0.8,
      }),
    ]);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Check if application is ready to serve traffic' })
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.customHealth.isHealthy('readiness'),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Check if application is alive' })
  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      () => this.customHealth.isHealthy('liveness'),
    ]);
  }
}