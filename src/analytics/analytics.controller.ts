import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Post,
  Body,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { MarketData } from '../market-data/market-data.entity';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly predictiveService: PredictiveAnalyticsService,
  ) {}

  @Post('forecast')
  forecast(@Body() data: MarketData[]) {
    return this.predictiveService.forecastMarketTrends(data);
  }

  @Post('backtest')
  backtest(@Body() body: { strategy: any; historicalData: MarketData[] }) {
    return this.predictiveService.backtestStrategy(
      body.strategy,
      body.historicalData,
    );
  }

  @Get(':userId')
  @ApiOperation({
    summary: 'Get user analytics',
    description: 'Returns analytics data for a specific user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID (string)' })
  @ApiResponse({
    status: 200,
    description: 'User analytics',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserAnalytics(
    @Param('userId') userId: string,
  ): Promise<AnalyticsResponseDto> {
    const result = await this.analyticsService.getUserAnalytics(userId);
    if (!result) {
      throw new NotFoundException(
        `Not enough snapshots found for user ${userId}`,
      );
    }
    return result;
  }
}
