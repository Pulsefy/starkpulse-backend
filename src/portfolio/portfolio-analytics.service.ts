// Provides advanced risk metrics (e.g., VaR, Sharpe ratio) and portfolio analytics
import { Injectable } from '@nestjs/common';
import { PortfolioSnapshot } from './entities/portfolio.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioRealtimeGateway } from './portfolio-realtime.gateway';
import { RiskMetricsResult } from './dto/risk-metrics-result.dto';

@Injectable()
export class PortfolioAnalyticsService {
  constructor(
    private readonly realtimeGateway: PortfolioRealtimeGateway,
    @InjectRepository(PortfolioSnapshot)
    private readonly snapshotRepo: Repository<PortfolioSnapshot>,
  ) {}

  /**
   * Calculate Value at Risk (VaR) and Sharpe Ratio for a portfolio snapshot.
   * Assumes assetBreakdown contains asset symbols and their values.
   * For demo, uses random returns. Replace with real historical data for production.
   */
  async calculateRiskMetrics(
    portfolio: PortfolioSnapshot,
  ): Promise<RiskMetricsResult> {
    // Fetch historical snapshots for this user, sorted by timestamp
    const history = await this.snapshotRepo.find({
      where: { user: portfolio.user },
      order: { timestamp: 'ASC' },
      take: 252, // Use last 252 days for 1-year daily returns
    });
    // Calculate daily returns from totalValue
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const prev = Number(history[i - 1].totalValue);
      const curr = Number(history[i].totalValue);
      if (prev > 0) returns.push((curr - prev) / prev);
    }
    // Fallback to mock returns if not enough data
    const usedReturns =
      returns.length > 10 ? returns : this.mockReturns(portfolio);
    const confidenceLevel = 0.95;
    const valueAtRisk = this.calculateVaR(usedReturns, confidenceLevel);
    const sharpeRatio = this.calculateSharpeRatio(usedReturns, 0.02);

    // Real-time update (example):
    this.realtimeGateway.sendPortfolioUpdate(
      String(portfolio.user?.id ?? 'unknown'),
      {
        valueAtRisk,
        sharpeRatio,
      },
    );

    return {
      valueAtRisk,
      sharpeRatio,
    };
  }

  // Mock returns for demonstration. Replace with real historical returns.
  private mockReturns(portfolio: PortfolioSnapshot): number[] {
    const n = 100;
    return Array.from({ length: n }, () => (Math.random() - 0.5) * 0.04); // -2% to +2%
  }

  // Historical simulation VaR
  private calculateVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return Math.abs(sorted[index]);
  }

  // Sharpe Ratio: (mean portfolio return - risk-free rate) / std deviation
  private calculateSharpeRatio(
    returns: number[],
    riskFreeRate: number,
  ): number {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length,
    );
    return std === 0 ? 0 : (mean - riskFreeRate / 252) / std;
  }

  // TODO: For large portfolios, use batch processing and streaming for performance.

  // Add more advanced analytics methods here
}
