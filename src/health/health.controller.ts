import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckResult } from './interfaces/health-check.interface';
import { HealthService } from './health.service';

@ApiTags('Health')
@ApiBearerAuth()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns the health status of the application and its dependencies.' })
  @ApiResponse({ status: 200, description: 'Health check result', example: { status: 'ok', checks: [{ name: 'database', status: 'ok' }, { name: 'cache', status: 'ok' }], timestamp: '2025-06-03T10:00:00.000Z' } })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
