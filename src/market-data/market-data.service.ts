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

  async fetchAndStoreMarketData(): Promise<void> {
    try {
      const res = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
      );

      const now = new Date();
      const entries = Object.entries(res.data).map(([symbol, data]: any) => ({
        symbol: symbol.toUpperCase(),
        priceUsd: data.usd,
        timestamp: now,
      }));

      await this.marketRepo.save(entries);
      this.logger.log(`Stored ${entries.length} market entries`);
    } catch (err) {
      this.logger.error('Failed to fetch market data', err);
    }
  }

  async getAllData(): Promise<MarketData[]> {
    return this.marketRepo.find({
      order: { timestamp: 'DESC' },
    });
  }

  analyzeMarketData(request: MarketAnalysisRequestDto) {
    const sorted = [...request.data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const prices = sorted.map(item => item.priceUsd);

    const sma = calculateSMA(prices, 14);
    const ema = calculateEMA(prices, 14);
    const rsi = calculateRSI(prices, 14);
    const volatility = calculateVolatility(prices);

    let correlation: number | null;

    if (request.compareWith && request.compareWith.length === prices.length) {
      const compareSorted = [...request.compareWith].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const comparePrices = compareSorted.map(item => item.priceUsd);
      correlation = pearsonCorrelation(prices, comparePrices);
    }

    const trend = this.identifyTrend(sma, ema);

    return {
      sma,
      ema,
      rsi,
      volatility,
      correlation,
      trend,
    };
  }

  private identifyTrend(sma: number[], ema: number[]): 'uptrend' | 'downtrend' | 'sideways' {
    const recentSMA = sma.at(-1);
    const recentEMA = ema.at(-1);

    if (!recentSMA || !recentEMA) return 'sideways';
    if (recentEMA > recentSMA) return 'uptrend';
    if (recentEMA < recentSMA) return 'downtrend';
    return 'sideways';
  }
}
