import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketData } from '../entities/market-data.entity';

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  sma20: number;
  ema12: number;
  ema26: number;
  volume: number;
  volatility: number;
}

@Injectable()
export class TechnicalIndicatorsService {
  constructor(
    @InjectRepository(MarketData)
    private readonly marketDataRepository: Repository<MarketData>,
  ) {}

  async calculateIndicators(symbol: string): Promise<TechnicalIndicators> {
    const historicalData = await this.getHistoricalData(symbol, 50);
    
    if (historicalData.length < 26) {
      throw new Error('Insufficient data for technical indicators');
    }

    const prices = historicalData.map(d => d.price);
    const volumes = historicalData.map(d => d.volume);

    return {
      rsi: this.calculateRSI(prices),
      macd: this.calculateMACD(prices),
      bollingerBands: this.calculateBollingerBands(prices),
      sma20: this.calculateSMA(prices, 20),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      volume: volumes[volumes.length - 1],
      volatility: this.calculateVolatility(prices)
    };
  }

  private async getHistoricalData(symbol: string, limit: number): Promise<MarketData[]> {
    return await this.marketDataRepository.find({
      where: { symbol },
      order: { timestamp: 'DESC' },
      take: limit
    });
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    const macdLine = [];
    for (let i = 25; i < prices.length; i++) {
      const ema12_i = this.calculateEMAAtIndex(prices, 12, i);
      const ema26_i = this.calculateEMAAtIndex(prices, 26, i);
      macdLine.push(ema12_i - ema26_i);
    }

    const signal = this.calculateEMA(macdLine, 9);
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const sma = this.calculateSMA(prices, period);
    const variance = this.calculateVariance(prices.slice(-period));
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  private calculateSMA(prices: number[], period: number): number {
    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((sum, price) => sum + price, 0) / relevantPrices.length;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateEMAAtIndex(prices: number[], period: number, index: number): number {
    if (index < period - 1) return prices[index];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i <= index; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateVariance(prices: number[]): number {
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  }

  private calculateVolatility(prices: number[], period: number = 20): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < Math.min(prices.length, period + 1); i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252);
  }
}
