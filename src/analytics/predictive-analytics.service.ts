// Predictive analytics and market forecasting service
import { Injectable } from '@nestjs/common';
import { MarketData } from '../market-data/market-data.entity';

@Injectable()
export class PredictiveAnalyticsService {
  /**
   * Forecast market trends using a simple moving average (SMA) as a placeholder for ML models.
   * Replace with real ML model inference for production.
   */
  forecastMarketTrends(data: MarketData[]): any {
    if (!data || data.length < 2) return { forecast: null };
    // Simple SMA forecast
    const prices = data.map((d) => Number(d.priceUsd));
    const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { forecast: sma };
  }

  /**
   * Backtest a strategy on historical data. For demo, returns mock performance.
   * Replace with real backtesting logic for production.
   */
  backtestStrategy(strategy: any, historicalData: MarketData[]): any {
    // For large datasets, process in batches/chunks for performance
    if (!historicalData || historicalData.length < 2)
      return { performance: null };
    // Example: Buy and hold
    const start = Number(historicalData[0].priceUsd);
    const end = Number(historicalData[historicalData.length - 1].priceUsd);
    const returnPct = ((end - start) / start) * 100;
    return { performance: { returnPct } };
  }
}
