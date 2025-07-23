import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketData } from './market-data.entity';
import { MarketAnalysisRequestDto } from './dto/market-analysis.dto';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateVolatility,
  pearsonCorrelation,
} from './market-data.utils';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    @InjectRepository(MarketData)
    private marketRepo: Repository<MarketData>,
  ) {}

  /**
   * Fetch and store market data from multiple providers (CoinGecko, Binance, etc.)
   * For demo, only CoinGecko and a mock Binance endpoint are used.
   */
  async fetchAndStoreMarketData(): Promise<void> {
    const now = new Date();
    const allEntries: any[] = [];
    // CoinGecko
    try {
      const res = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
      );
      const entries = Object.entries(res.data).map(([symbol, data]: any) => ({
        symbol: symbol.toUpperCase(),
        priceUsd: data.usd,
        timestamp: now,
      }));
      allEntries.push(...entries);
    } catch (err) {
      this.logger.error('Failed to fetch CoinGecko data', err);
    }
    // Binance (mocked for demo)
    try {
      // Replace with real Binance API call
      const binanceData = {
        BTC: { usd: 60000 + Math.random() * 1000 },
        ETH: { usd: 3500 + Math.random() * 100 },
      };
      const entries = Object.entries(binanceData).map(
        ([symbol, data]: any) => ({
          symbol: symbol.toUpperCase(),
          priceUsd: data.usd,
          timestamp: now,
        }),
      );
      allEntries.push(...entries);
    } catch (err) {
      this.logger.error('Failed to fetch Binance data', err);
    }
    // Merge and deduplicate by symbol, prefer CoinGecko
    const unique = new Map();
    for (const entry of allEntries) {
      if (!unique.has(entry.symbol)) unique.set(entry.symbol, entry);
    }
    await this.marketRepo.save(Array.from(unique.values()));
    this.logger.log(
      `Stored ${unique.size} market entries from multiple providers`,
    );
  }

  async getAllData(): Promise<MarketData[]> {
    return this.marketRepo.find({
      order: { timestamp: 'DESC' },
    });
  }

  async analyzeMarketData(request: any): Promise<any> {
    const sorted = [...request.data].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const prices = sorted.map((item) => item.priceUsd);

    const technicalIndicators = this.calculateTechnicalIndicators(prices);
    let correlation: number | null = null;

    if (request.compareWith && request.compareWith.length === prices.length) {
      const compareSorted = [...request.compareWith].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const comparePrices = compareSorted.map((item) => item.priceUsd);
      correlation = this.pearsonCorrelation(prices, comparePrices);
    }

    return {
      prices: sorted,
      ...technicalIndicators,
      correlation,
    };
  }

  private calculateTechnicalIndicators(prices: number[]): any {
    const sma = this.calculateSMA(prices, 20);
    const ema = this.calculateEMA(prices, 20);
    const rsi = this.calculateRSI(prices, 14);
    const volatility = this.calculateVolatility(prices);

    const trend = this.identifyTrend(sma, ema);

    return {
      sma,
      ema,
      rsi,
      volatility,
      trend,
    };
  }

  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices
        .slice(i - period + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    ema[0] = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema[i] = prices[i] * multiplier + ema[i - 1] * (1 - multiplier);
    }
    return ema;
  }

  private calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain =
        gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }

    return rsi;
  }

  private calculateVolatility(prices: number[]): number {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private identifyTrend(sma: number[], ema: number[]): string {
    if (sma.length < 2 || ema.length < 2) {
      return 'insufficient_data';
    }

    const latestSma = sma[sma.length - 1];
    const previousSma = sma[sma.length - 2];
    const latestEma = ema[ema.length - 1];
    const previousEma = ema[ema.length - 2];

    // Determine trend based on SMA and EMA movement
    const smaRising = latestSma > previousSma;
    const emaRising = latestEma > previousEma;
    const emaAboveSma = latestEma > latestSma;

    if (smaRising && emaRising && emaAboveSma) {
      return 'strong_uptrend';
    } else if (smaRising && emaRising) {
      return 'uptrend';
    } else if (!smaRising && !emaRising && !emaAboveSma) {
      return 'strong_downtrend';
    } else if (!smaRising && !emaRising) {
      return 'downtrend';
    } else {
      return 'sideways';
    }
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
