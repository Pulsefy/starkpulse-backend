import {
  Controller,
  Get,
  Query,
  Request,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PortfolioAnalyticsService } from '../services/portfolio-analytics.service';
import { PortfolioAnalyticsQueryDto, PortfolioAnalyticsSummaryDto, RiskMetricsDto, PerformanceMetricsDto, AssetCorrelationDto, PortfolioOptimizationDto } from '../dto/portfolio-analytics.dto';

@Controller('api/portfolio/analytics')
export class PortfolioAnalyticsController {
  constructor(
    private readonly portfolioAnalyticsService: PortfolioAnalyticsService,
  ) {}

  @Get('summary')
  async getAnalyticsSummary(
    @Request() req,
    @Query() query: PortfolioAnalyticsQueryDto,
  ): Promise<PortfolioAnalyticsSummaryDto> {
    const userId = req.user.id;
    return this.portfolioAnalyticsService.calculateAnalyticsSummary(userId, query);
  }

  @Get('risk')
  async getRiskMetrics(
    @Request() req,
    @Query() query: PortfolioAnalyticsQueryDto,
  ): Promise<RiskMetricsDto> {
    const userId = req.user.id;
    return this.portfolioAnalyticsService.calculateRiskMetrics(userId, query);
  }

  @Get('performance')
  async getPerformanceMetrics(
    @Request() req,
    @Query() query: PortfolioAnalyticsQueryDto,
  ): Promise<PerformanceMetricsDto> {
    const userId = req.user.id;
    return this.portfolioAnalyticsService.calculatePerformanceMetrics(userId, query);
  }

  @Get('correlation')
  async getAssetCorrelations(
    @Request() req,
    @Query() query: PortfolioAnalyticsQueryDto,
  ): Promise<AssetCorrelationDto[]> {
    const userId = req.user.id;
    return this.portfolioAnalyticsService.calculateAssetCorrelations(userId, query);
  }

  @Get('optimization')
  async getOptimizationSuggestions(
    @Request() req,
    @Query() query: PortfolioAnalyticsQueryDto,
  ): Promise<PortfolioOptimizationDto> {
    const userId = req.user.id;
    return this.portfolioAnalyticsService.generateOptimizationSuggestions(userId, query);
  }

  @Get('benchmark')
  async getBenchmarkComparison(
    @Request() req,
    @Query() query: PortfolioAnalyticsQueryDto,
  ) {
    const userId = req.user.id;
    return this.portfolioAnalyticsService.calculateBenchmarkComparison(userId, query);
  }

  @Get('attribution')
  async getPerformanceAttribution(
    @Request() req,
    @Query() query: PortfolioAnalyticsQueryDto,
  ) {
    const userId = req.user.id;
    // Get snapshots for attribution analysis
    const snapshots = await this.portfolioAnalyticsService['getHistoricalSnapshots'](userId, query.period);
    return this.portfolioAnalyticsService.calculatePerformanceAttribution(userId, snapshots);
  }
} 