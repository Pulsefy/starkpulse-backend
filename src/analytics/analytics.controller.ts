import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get user analytics', description: 'Returns analytics data for a specific user.' })
  @ApiParam({ name: 'userId', description: 'User ID (number)' })
  @ApiResponse({ status: 200, description: 'User analytics', example: { userId: 42, totalTrades: 100, bestAsset: 'ETH', bestReturn: 0.25 } })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getUserAnalytics(@Param('userId') userId: string) {
    return this.analyticsService.getAnalytics(Number(userId));
  }
}
