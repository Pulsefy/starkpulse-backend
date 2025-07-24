/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PortfolioQueryDto } from './dto/portfolio-query.dto';
import { PortfolioService } from './services/portfolio.service';
import { PortfolioAnalyticsService } from './portfolio-analytics.service';
import { PortfolioReportService } from './portfolio-report.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@ApiTags('Portfolio')
@ApiBearerAuth()
@Controller('api/portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly analyticsService: PortfolioAnalyticsService,
    private readonly reportService: PortfolioReportService,
  ) {}
  @Post('risk-metrics')
  async getRiskMetrics(@Body() portfolio: any) {
    return this.analyticsService.calculateRiskMetrics(portfolio);
  }

  @Get(':id/report')
  async getPortfolioReport(@Param('id') id: string) {
    const pdf = await this.reportService.generatePdfReport(id);
    return { pdf: pdf.toString('base64') };
  }

  @Get()
  @ApiOperation({
    summary: 'Get user portfolio assets',
    description: 'Returns the portfolio assets for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the user portfolio',
    example: {
      assets: [{ symbol: 'ETH', balance: 2.5, valueUsd: 9000 }],
      totalValueUsd: 9000,
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserPortfolio(@Request() req, @Query() query: PortfolioQueryDto) {
    const userId = req.user.id;
    return this.portfolioService.getUserPortfolio(userId, query);
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Manually trigger portfolio sync',
    description: 'Triggers a manual synchronization of the user portfolio.',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio synchronization started',
    example: { message: 'Portfolio synchronization completed' },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async syncPortfolio(@Request() req) {
    const userId = req.user.id;
    const walletAddress = req.user.walletAddress;

    await this.portfolioService.syncUserPortfolio(userId, walletAddress);
    return { message: 'Portfolio synchronization completed' };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get portfolio value history',
    description: 'Returns the historical value of the user portfolio.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to retrieve history for',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns portfolio value history',
    example: {
      history: [
        { date: '2025-06-01', valueUsd: 8500 },
        { date: '2025-06-02', valueUsd: 9000 },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPortfolioHistory(@Request() req, @Query('days') days: number) {
    const userId = req.user.id;
    return this.portfolioService.getPortfolioHistory(userId, days);
  }

  @Get('analytics/:userId')
  @ApiOperation({
    summary: 'Get portfolio analytics for a user',
    description: 'Returns analytics data for the specified user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns portfolio analytics',
    example: { totalTrades: 42, bestAsset: 'ETH', bestReturn: 0.25 },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getAnalytics(@Param('userId') userId: string) {
    return this.portfolioService.getUserAnalytics(userId);
  }
}
