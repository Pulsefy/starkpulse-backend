import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':userId')
  async getAnalytics(
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
