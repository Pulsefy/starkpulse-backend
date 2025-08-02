import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MarketDataService, AggregatedMarketData } from './market-data.service';
import { TechnicalIndicatorsService, TechnicalIndicators } from './technical-indicators.service';
import { SentimentAnalysisService, SentimentData } from './sentiment-analysis.service';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly technicalIndicatorsService: TechnicalIndicatorsService,
    private readonly sentimentAnalysisService: SentimentAnalysisService,
  ) {}

  @Get(':symbol')
  @ApiOperation({ summary: 'Get current market data for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol (e.g., bitcoin, ethereum)' })
  @ApiResponse({ status: 200, description: 'Market data retrieved successfully' })
  async getMarketData(@Param('symbol') symbol: string): Promise<AggregatedMarketData> {
    return await this.marketDataService.getMarketData(symbol);
  }

  @Get(':symbol/indicators')
  @ApiOperation({ summary: 'Get technical indicators for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiResponse({ status: 200, description: 'Technical indicators calculated successfully' })
  async getTechnicalIndicators(@Param('symbol') symbol: string): Promise<TechnicalIndicators> {
    return await this.technicalIndicatorsService.calculateIndicators(symbol);
  }

  @Get(':symbol/sentiment')
  @ApiOperation({ summary: 'Get sentiment analysis for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiResponse({ status: 200, description: 'Sentiment analysis completed successfully' })
  async getSentimentAnalysis(@Param('symbol') symbol: string): Promise<SentimentData> {
    return await this.sentimentAnalysisService.analyzeSentiment(symbol);
  }

  @Get(':symbol/historical')
  @ApiOperation({ summary: 'Get historical market data' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiQuery({ name: 'period', description: 'Time period (1d, 7d, 30d, 90d, 1y)', required: false })
  @ApiQuery({ name: 'interval', description: 'Data interval (1m, 5m, 1h, 1d)', required: false })
  @ApiResponse({ status: 200, description: 'Historical data retrieved successfully' })
  async getHistoricalData(
    @Param('symbol') symbol: string,
    @Query('period') period: string = '30d',
    @Query('interval') interval: string = '1h'
  ): Promise<AggregatedMarketData[]> {
    return await this.marketDataService.getHistoricalData(symbol, period, interval);
  }

  @Get(':symbol/quality-metrics')
  @ApiOperation({ summary: 'Get data quality metrics for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiResponse({ status: 200, description: 'Quality metrics retrieved successfully' })
  async getQualityMetrics(@Param('symbol') symbol: string) {
    return await this.marketDataService.getQualityMetrics(symbol);
  }

  @Post('backfill')
  @ApiOperation({ summary: 'Trigger historical data backfill' })
  @ApiResponse({ status: 200, description: 'Backfill process started successfully' })
  async triggerBackfill(@Body() body: { symbols?: string[]; days?: number }) {
    const { symbols, days = 30 } = body;
    return await this.marketDataService.triggerBackfill(symbols, days);
  }

  @Get('sources/status')
  @ApiOperation({ summary: 'Get data source status and health' })
  @ApiResponse({ status: 200, description: 'Source status retrieved successfully' })
  async getSourceStatus() {
    return await this.marketDataService.getSourceStatus();
  }

  @Get('health/check')
  @ApiOperation({ summary: 'Health check for market data system' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async healthCheck() {
    return await this.marketDataService.healthCheck();
  }
}
