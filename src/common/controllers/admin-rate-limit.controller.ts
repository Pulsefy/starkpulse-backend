import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitMetricsStore } from '../stores/rate-limit-metrics.store';
import { EnhancedSystemHealthService } from '../services/enhanced-system-health.service';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RateLimitStatsResponseDto,
  RateLimitStatsDto,
  SystemMetricsDto,
} from '../dto/rate-limit-stats.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    roles: string[];
  };
}

@ApiTags('Admin Rate Limit Monitoring')
@Controller('admin/rate-limit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminRateLimitController {
  private readonly logger = new Logger(AdminRateLimitController.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly metricsStore: RateLimitMetricsStore,
    private readonly systemHealthService: EnhancedSystemHealthService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get rate limit statistics for all users' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by specific user ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate limit statistics retrieved successfully',
    type: RateLimitStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async getRateLimitStats(
    @Query('userId') userId?: number,
    @Query('limit') limit?: number,
    @Req() req?: AuthenticatedRequest,
  ): Promise<RateLimitStatsResponseDto> {
    this.logger.log(
      `Admin ${req?.user?.id} requested rate limit stats${userId ? ` for user ${userId}` : ''}`,
    );

    try {
      const maxLimit = Math.min(limit || 100, 1000);
      let userStats: RateLimitStatsDto[];

      if (userId) {
        const userMetrics = await this.metricsStore.getMetricsByUserId(userId);
        userStats = userMetrics.slice(0, maxLimit).map(this.mapMetricsToDto);
      } else {
        const allMetrics = await this.metricsStore.getAllMetrics();
        userStats = allMetrics.slice(0, maxLimit).map(this.mapMetricsToDto);
      }

      const systemMetrics = await this.metricsStore.getSystemMetrics();
      const currentSystemMetrics = await this.systemHealthService.getSystemMetrics();

      const systemMetricsDto: SystemMetricsDto = {
        ...systemMetrics,
        currentSystemMetrics: {
          cpuUsage: currentSystemMetrics.cpu.usage,
          memoryUsage: currentSystemMetrics.memory.usage,
          systemLoad: currentSystemMetrics.load.systemLoad,
          cores: currentSystemMetrics.cpu.cores,
        },
      };

      return {
        systemMetrics: systemMetricsDto,
        userStats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit stats:', error);
      throw error;
    }
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get current system health metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health metrics retrieved successfully',
  })
  async getSystemHealth() {
    try {
      const systemMetrics = await this.systemHealthService.getSystemMetrics();
      const isUnderLoad = this.systemHealthService.isSystemUnderLoad();
      const loadFactor = this.systemHealthService.getLoadFactor();

      return {
        ...systemMetrics,
        isUnderLoad,
        loadFactor,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      throw error;
    }
  }

  @Get('adaptive/status')
  @ApiOperation({ summary: 'Get adaptive rate limiting status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Adaptive rate limiting status retrieved successfully',
  })
  async getAdaptiveStatus() {
    try {
      const systemMetrics = await this.systemHealthService.getSystemMetrics();
      const isUnderLoad = this.systemHealthService.isSystemUnderLoad();
      const loadFactor = this.systemHealthService.getLoadFactor();

      return {
        isUnderLoad,
        loadFactor,
        currentMultiplier: this.rateLimitService['currentAdaptiveMultiplier'],
        systemMetrics: {
          cpuUsage: systemMetrics.cpu.usage,
          memoryUsage: systemMetrics.memory.usage,
          systemLoad: systemMetrics.load.systemLoad,
        },
        adaptiveConfig: this.rateLimitService['adaptiveConfig'],
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get adaptive status:', error);
      throw error;
    }
  }

  private mapMetricsToDto(metrics: any): RateLimitStatsDto {
    return {
      userId: metrics.userId,
      key: metrics.key,
      bucketSize: metrics.bucketSize,
      refillRate: metrics.refillRate,
      tokensLeft: metrics.tokensLeft,
      lastRequestTime: metrics.lastRequestTime,
      deniedRequests: metrics.deniedRequests,
      totalRequests: metrics.totalRequests,
      systemCpuLoad: metrics.systemCpuLoad,
      systemMemoryLoad: metrics.systemMemoryLoad,
      adaptiveMultiplier: metrics.adaptiveMultiplier,
      createdAt: metrics.createdAt,
      updatedAt: metrics.updatedAt,
    };
  }
} 