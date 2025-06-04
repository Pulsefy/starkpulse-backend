import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Registry } from 'prom-client';
import { MetricsService } from './metrics-service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
   @Inject('PROM_REGISTRY') private readonly registry: Registry,
    private readonly metricsService: MetricsService,
  ) {}


    @Get()
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  @Get('custom')
  @ApiOperation({ summary: 'Get custom application metrics' })
  @ApiResponse({ status: 200, description: 'Custom metrics object' })
  async getCustomMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: await this.metricsService.getCustomMetrics(),
    };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getPerformanceMetrics() {
    return {
      timestamp: new Date().toISOString(),
      performance: await this.metricsService.getPerformanceMetrics(),
    };
  }

  @Get('business')
  @ApiOperation({ summary: 'Get business metrics' })
  @ApiResponse({ status: 200, description: 'Business-specific metrics' })
  async getBusinessMetrics() {
    return {
      timestamp: new Date().toISOString(),
      business: await this.metricsService.getBusinessMetrics(),
    };
  }
}