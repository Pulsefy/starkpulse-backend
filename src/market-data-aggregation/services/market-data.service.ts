import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { MarketData } from '../entities/market-data.entity';
import { DataSource } from '../entities/data-source.entity';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { DataValidationService } from './data-validation.service';
import { SentimentData } from '../entities/sentiment-data.entity';

export interface MarketDataPoint {
  symbol: string;
  price: number;
  volume: number;
  marketCap: number;
  priceChange24h: number;
  timestamp: Date;
  source: string;
}

export interface AggregatedMarketData extends MarketDataPoint {
  qualityScore: number;
  confidence: number;
  indicators?: TechnicalIndicators;
  sentiment?: SentimentData;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly dataSources = ['coingecko', 'coinmarketcap', 'binance'];

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(MarketData)
    private readonly marketDataRepository: Repository<MarketData>,
    @InjectRepository(DataSource)
    private readonly dataSourceRepository: Repository<DataSource>,
    private readonly technicalIndicatorsService: TechnicalIndicatorsService,
    private readonly sentimentAnalysisService: SentimentAnalysisService,
    private readonly dataValidationService: DataValidationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async aggregateMarketData(): Promise<void> {
    try {
      const symbols = await this.getActiveSymbols();
      
      for (const symbol of symbols) {
        const dataPoints = await this.fetchFromAllSources(symbol);
        const validatedData = await this.dataValidationService.validateData(dataPoints);
        const aggregatedData = await this.resolveConflicts(validatedData);
        const enrichedData = await this.enrichWithIndicators(aggregatedData);
        
        await this.saveMarketData(enrichedData);
      }
    } catch (error) {
      this.logger.error(`Market data aggregation failed: ${error.message}`);
    }
  }

  private async fetchFromAllSources(symbol: string): Promise<MarketDataPoint[]> {
    const promises = this.dataSources.map(source => this.fetchFromSource(source, symbol));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<MarketDataPoint>).value)
      .filter(data => data !== null);
  }

  private async fetchFromSource(source: string, symbol: string): Promise<MarketDataPoint | null> {
    try {
      switch (source) {
        case 'coingecko':
          return await this.fetchFromCoinGecko(symbol);
        case 'coinmarketcap':
          return await this.fetchFromCoinMarketCap(symbol);
        case 'binance':
          return await this.fetchFromBinance(symbol);
        default:
          return null;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch from ${source}: ${error.message}`);
      return null;
    }
  }

  private async fetchFromCoinGecko(symbol: string): Promise<MarketDataPoint> {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data[symbol];
    
    return {
      symbol,
      price: data.usd,
      volume: data.usd_24h_vol,
      marketCap: data.usd_market_cap,
      priceChange24h: data.usd_24h_change,
      timestamp: new Date(),
      source: 'coingecko'
    };
  }

  private async fetchFromCoinMarketCap(symbol: string): Promise<MarketDataPoint> {
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}`;
    const headers = { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY };
    const response = await firstValueFrom(this.httpService.get(url, { headers }));
    const data = response.data.data[symbol.toUpperCase()];
    
    return {
      symbol,
      price: data.quote.USD.price,
      volume: data.quote.USD.volume_24h,
      marketCap: data.quote.USD.market_cap,
      priceChange24h: data.quote.USD.percent_change_24h,
      timestamp: new Date(),
      source: 'coinmarketcap'
    };
  }

  private async fetchFromBinance(symbol: string): Promise<MarketDataPoint> {
    const ticker24h = await firstValueFrom(
      this.httpService.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`)
    );
    
    return {
      symbol,
      price: parseFloat(ticker24h.data.lastPrice),
      volume: parseFloat(ticker24h.data.volume),
      marketCap: 0,
      priceChange24h: parseFloat(ticker24h.data.priceChangePercent),
      timestamp: new Date(),
      source: 'binance'
    };
  }

  private async resolveConflicts(dataPoints: MarketDataPoint[]): Promise<AggregatedMarketData> {
    if (dataPoints.length === 0) throw new Error('No valid data points');
    
    if (dataPoints.length === 1) {
      return {
        ...dataPoints[0],
        qualityScore: 0.7,
        confidence: 0.6
      };
    }

    const weights = this.getSourceWeights();
    const weightedData = this.calculateWeightedAverage(dataPoints, weights);
    const qualityScore = this.calculateQualityScore(dataPoints);
    const confidence = this.calculateConfidence(dataPoints);

    return {
      ...weightedData,
      qualityScore,
      confidence
    };
  }

  private getSourceWeights(): Record<string, number> {
    return {
      coingecko: 0.4,
      coinmarketcap: 0.4,
      binance: 0.2
    };
  }

  private calculateWeightedAverage(dataPoints: MarketDataPoint[], weights: Record<string, number>): MarketDataPoint {
    let totalWeight = 0;
    let weightedPrice = 0;
    let weightedVolume = 0;
    let weightedMarketCap = 0;
    let weightedChange = 0;

    for (const point of dataPoints) {
      const weight = weights[point.source] || 0.1;
      totalWeight += weight;
      weightedPrice += point.price * weight;
      weightedVolume += point.volume * weight;
      weightedMarketCap += point.marketCap * weight;
      weightedChange += point.priceChange24h * weight;
    }

    return {
      symbol: dataPoints[0].symbol,
      price: weightedPrice / totalWeight,
      volume: weightedVolume / totalWeight,
      marketCap: weightedMarketCap / totalWeight,
      priceChange24h: weightedChange / totalWeight,
      timestamp: new Date(),
      source: 'aggregated'
    };
  }

  private calculateQualityScore(dataPoints: MarketDataPoint[]): number {
    if (dataPoints.length === 1) return 0.7;
    
    const priceVariation = this.calculateVariation(dataPoints.map(d => d.price));
    const volumeVariation = this.calculateVariation(dataPoints.map(d => d.volume));
    
    const consistencyScore = Math.max(0, 1 - (priceVariation + volumeVariation) / 2);
    const sourceScore = Math.min(1, dataPoints.length / 3);
    
    return (consistencyScore * 0.7) + (sourceScore * 0.3);
  }

  private calculateVariation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private calculateConfidence(dataPoints: MarketDataPoint[]): number {
    const sourceCount = dataPoints.length;
    const recencyScore = this.calculateRecencyScore(dataPoints);
    const consensusScore = this.calculateConsensusScore(dataPoints);
    
    return (sourceCount / 3 * 0.4) + (recencyScore * 0.3) + (consensusScore * 0.3);
  }

  private calculateRecencyScore(dataPoints: MarketDataPoint[]): number {
    const now = new Date();
    const avgAge = dataPoints.reduce((sum, point) => {
      return sum + (now.getTime() - point.timestamp.getTime());
    }, 0) / dataPoints.length;
    
    const maxAge = 5 * 60 * 1000;
    return Math.max(0, 1 - avgAge / maxAge);
  }

  private calculateConsensusScore(dataPoints: MarketDataPoint[]): number {
    if (dataPoints.length < 2) return 0.5;
    
    const prices = dataPoints.map(d => d.price);
    const priceVariation = this.calculateVariation(prices);
    
    return Math.max(0, 1 - priceVariation * 10);
  }

  private async enrichWithIndicators(data: AggregatedMarketData): Promise<AggregatedMarketData> {
    try {
      const indicators = await this.technicalIndicatorsService.calculateIndicators(data.symbol);
      const sentiment = await this.sentimentAnalysisService.analyzeSentiment(data.symbol);
      
      return {
        ...data,
        indicators,
        sentiment
      };
    } catch (error) {
      this.logger.warn(`Failed to enrich data for ${data.symbol}: ${error.message}`);
      return data;
    }
  }

  private async saveMarketData(data: AggregatedMarketData): Promise<void> {
    const marketData = this.marketDataRepository.create({
      symbol: data.symbol,
      price: data.price,
      volume: data.volume,
      marketCap: data.marketCap,
      priceChange24h: data.priceChange24h,
      qualityScore: data.qualityScore,
      confidence: data.confidence,
      indicators: data.indicators,
      sentiment: data.sentiment,
      timestamp: data.timestamp
    });

    await this.marketDataRepository.save(marketData);
  }

  private async getActiveSymbols(): Promise<string[]> {
    return ['bitcoin', 'ethereum', 'starknet'];
  }

  async getHistoricalData(symbol: string, period: string, interval: string): Promise<AggregatedMarketData[]> {
    const endDate = new Date();
    const startDate = this.calculateStartDate(endDate, period);
    
    return await this.marketDataRepository.find({
      where: {
        symbol,
        timestamp: Between(startDate, endDate)
      },
      order: { timestamp: 'ASC' }
    });
  }

  async getQualityMetrics(symbol: string) {
    const recentData = await this.marketDataRepository.find({
      where: { symbol },
      order: { timestamp: 'DESC' },
      take: 100
    });

    if (recentData.length === 0) {
      return { error: 'No data available for symbol' };
    }

    const avgQuality = recentData.reduce((sum, d) => sum + d.qualityScore, 0) / recentData.length;
    const avgConfidence = recentData.reduce((sum, d) => sum + d.confidence, 0) / recentData.length;
    
    const sourceDistribution = recentData.reduce((acc, d) => {
      acc[d.source] = (acc[d.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      symbol,
      averageQuality: avgQuality,
      averageConfidence: avgConfidence,
      dataPoints: recentData.length,
      sourceDistribution,
      lastUpdate: recentData[0]?.timestamp
    };
  }

  async triggerBackfill(symbols?: string[], days: number = 30): Promise<{ message: string; symbols: string[] }> {
    const targetSymbols = symbols || await this.getActiveSymbols();
    
    Promise.resolve().then(async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      for (const symbol of targetSymbols) {
        await this.backfillSymbolData(symbol, startDate, endDate);
      }
    });

    return {
      message: 'Backfill process started',
      symbols: targetSymbols
    };
  }

  async getSourceStatus() {
    const sources = await this.dataSourceRepository.find();
    const status: Array<{
      name: any;
      isActive: any;
      reliability: any;
      weight: any;
      lastSuccessfulFetch: any;
      consecutiveFailures: any;
      status: string;
      rateLimitUsage: string;
    }> = [];

    for (const source of sources) {
      const recentSuccess = source.lastSuccessfulFetch ? 
        Date.now() - source.lastSuccessfulFetch.getTime() < 300000 : false;
      
      status.push({
        name: source.name,
        isActive: source.isActive,
        reliability: source.reliability,
        weight: source.weight,
        lastSuccessfulFetch: source.lastSuccessfulFetch,
        consecutiveFailures: source.consecutiveFailures,
        status: recentSuccess ? 'healthy' : 'degraded',
        rateLimitUsage: `${source.currentUsage}/${source.rateLimitPerHour}`
      });
    }

    return { sources: status, timestamp: new Date() };
  }

  async healthCheck() {
    const activeSymbols = await this.getActiveSymbols();
    const healthStatus = {
      status: 'healthy',
      services: {
        dataAggregation: 'healthy',
        technicalIndicators: 'healthy',
        sentimentAnalysis: 'healthy',
        dataValidation: 'healthy'
      },
      metrics: {
        activeSymbols: activeSymbols.length,
        lastAggregation: null as Date | null,
        dataQuality: 0,
        systemLoad: 'normal'
      },
      timestamp: new Date()
    };

    try {
      const recentData = await this.marketDataRepository.findOne({
        order: { timestamp: 'DESC' }
      });
      
      if (recentData) {
        healthStatus.metrics.lastAggregation = recentData.timestamp;
        const timeSinceLastUpdate = Date.now() - recentData.timestamp.getTime();
        
        if (timeSinceLastUpdate > 600000) {
          healthStatus.status = 'degraded';
          healthStatus.services.dataAggregation = 'degraded';
        }
      }

      const qualityMetrics = await Promise.all(
        activeSymbols.map(symbol => this.getQualityMetrics(symbol))
      );
      
      const avgQuality = qualityMetrics.reduce((sum, m) => 
        sum + (typeof m === 'object' && 'averageQuality' in m ? m.averageQuality : 0), 0
      ) / qualityMetrics.length;
      
      healthStatus.metrics.dataQuality = avgQuality;
      
      if (avgQuality < 0.5) {
        healthStatus.status = 'degraded';
      }

    } catch (error) {
      healthStatus.status = 'unhealthy';
      healthStatus.services.dataAggregation = 'unhealthy';
    }

    return healthStatus;
  }

  private calculateStartDate(endDate: Date, period: string): Date {
    const periodMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const days = periodMap[period] || 30;
    return new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  }
  @Cron(CronExpression.EVERY_6_HOURS)
  async backfillHistoricalData(): Promise<void> {
    const symbols = await this.getActiveSymbols();
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const symbol of symbols) {
      await this.backfillSymbolData(symbol, startDate, endDate);
    }
  }

  private async backfillSymbolData(symbol: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      const historicalData = await this.fetchHistoricalData(symbol, startDate, endDate);
      
      for (const dataPoint of historicalData) {
        const existing = await this.marketDataRepository.findOne({
          where: {
            symbol: dataPoint.symbol,
            timestamp: dataPoint.timestamp
          }
        });

        if (!existing) {
          await this.saveMarketData(dataPoint);
        }
      }
    } catch (error) {
      this.logger.error(`Backfill failed for ${symbol}: ${error.message}`);
    }
  }

  private async fetchHistoricalData(symbol: string, startDate: Date, endDate: Date): Promise<AggregatedMarketData[]> {
    const url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart/range?vs_currency=usd&from=${Math.floor(startDate.getTime() / 1000)}&to=${Math.floor(endDate.getTime() / 1000)}`;
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data;

    return data.prices.map((price: [number, number], index: number) => ({
      symbol,
      price: price[1],
      volume: data.total_volumes[index]?.[1] || 0,
      marketCap: data.market_caps[index]?.[1] || 0,
      priceChange24h: 0,
      timestamp: new Date(price[0]),
      source: 'coingecko',
      qualityScore: 0.8,
      confidence: 0.7
    }));
  }
}
