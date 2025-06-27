import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioAsset, AssetType } from '../entities/portfolio-asset.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { PortfolioService } from './portfolio.service';
import { PriceService } from '../../price/price.service';
import { RiskCalculationsUtil } from '../utils/risk-calculations.util';
import { 
  PortfolioAnalyticsQueryDto, 
  RiskMetricsDto, 
  PerformanceMetricsDto, 
  AssetCorrelationDto, 
  PortfolioOptimizationDto,
  PortfolioAnalyticsSummaryDto 
} from '../dto/portfolio-analytics.dto';

@Injectable()
export class PortfolioAnalyticsService {
  private readonly logger = new Logger(PortfolioAnalyticsService.name);

  constructor(
    @InjectRepository(PortfolioAsset)
    private readonly portfolioAssetRepository: Repository<PortfolioAsset>,
    @InjectRepository(PortfolioSnapshot)
    private readonly portfolioSnapshotRepository: Repository<PortfolioSnapshot>,
    private readonly portfolioService: PortfolioService,
    private readonly priceService: PriceService,
  ) {}

  async calculateAnalyticsSummary(
    userId: string, 
    query: PortfolioAnalyticsQueryDto
  ): Promise<PortfolioAnalyticsSummaryDto> {
    this.logger.log(`Calculating analytics summary for user ${userId}`);

    const [riskMetrics, performanceMetrics, correlations] = await Promise.all([
      this.calculateRiskMetrics(userId, query),
      this.calculatePerformanceMetrics(userId, query),
      this.calculateAssetCorrelations(userId, query),
    ]);

    const portfolio = await this.portfolioService.getUserPortfolio(userId, {});
    const currentValue = parseFloat(portfolio.totalValueUsd);

    return {
      currentValue,
      riskMetrics,
      performanceMetrics,
      correlations,
      lastUpdated: new Date(),
    };
  }

  async calculateRiskMetrics(
    userId: string, 
    query: PortfolioAnalyticsQueryDto
  ): Promise<RiskMetricsDto> {
    this.logger.log(`Calculating risk metrics for user ${userId}`);

    const snapshots = await this.getHistoricalSnapshots(userId, query.period);
    const returns = RiskCalculationsUtil.calculateDailyReturns(
      snapshots.map(s => parseFloat(s.totalValueUsd))
    );

    const riskFreeRate = query.riskFreeRate || 0.02;
    const confidenceLevel = query.confidenceLevel || 0.95;

    return {
      var: RiskCalculationsUtil.calculateVaR(returns, confidenceLevel),
      sharpeRatio: RiskCalculationsUtil.calculateSharpeRatio(returns, riskFreeRate),
      volatility: RiskCalculationsUtil.calculateVolatility(returns),
      maxDrawdown: RiskCalculationsUtil.calculateMaxDrawdown(
        snapshots.map(s => parseFloat(s.totalValueUsd))
      ),
      beta: 1.0, // Default beta, would need market data for actual calculation
      sortinoRatio: RiskCalculationsUtil.calculateSortinoRatio(returns, riskFreeRate),
    };
  }

  async calculatePerformanceMetrics(
    userId: string, 
    query: PortfolioAnalyticsQueryDto
  ): Promise<PerformanceMetricsDto> {
    this.logger.log(`Calculating performance metrics for user ${userId}`);

    const snapshots = await this.getHistoricalSnapshots(userId, query.period);
    
    if (snapshots.length < 2) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        dailyReturn: 0,
        weeklyReturn: 0,
        monthlyReturn: 0,
        ytdReturn: 0,
      };
    }

    const values = snapshots.map(s => parseFloat(s.totalValueUsd));
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const totalReturn = RiskCalculationsUtil.calculateTotalReturn(startValue, endValue);
    
    const days = (snapshots[snapshots.length - 1].timestamp.getTime() - snapshots[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const annualizedReturn = RiskCalculationsUtil.calculateAnnualizedReturn(totalReturn, days);

    // Calculate period returns
    const dailyReturn = this.calculatePeriodReturn(snapshots, 1);
    const weeklyReturn = this.calculatePeriodReturn(snapshots, 7);
    const monthlyReturn = this.calculatePeriodReturn(snapshots, 30);
    const ytdReturn = this.calculateYTDReturn(snapshots);

    return {
      totalReturn,
      annualizedReturn,
      dailyReturn,
      weeklyReturn,
      monthlyReturn,
      ytdReturn,
    };
  }

  async calculateAssetCorrelations(
    userId: string, 
    query: PortfolioAnalyticsQueryDto
  ): Promise<AssetCorrelationDto[]> {
    this.logger.log(`Calculating asset correlations for user ${userId}`);

    const assets = await this.portfolioAssetRepository.find({
      where: { userId, isHidden: false },
    });

    const correlations: AssetCorrelationDto[] = [];
    const portfolio = await this.portfolioService.getUserPortfolio(userId, {});
    const totalValue = parseFloat(portfolio.totalValueUsd);

    for (const asset of assets) {
      if (!asset.symbol) continue;

      // Calculate correlation with portfolio (simplified - would need historical asset prices)
      const correlation = this.calculateAssetCorrelation(asset, assets);
      
      // Calculate weight
      const assetValue = parseFloat(asset.balance || '0');
      const weight = totalValue > 0 ? assetValue / totalValue : 0;

      correlations.push({
        assetAddress: asset.assetAddress,
        symbol: asset.symbol,
        correlation,
        weight,
      });
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  async generateOptimizationSuggestions(
    userId: string, 
    query: PortfolioAnalyticsQueryDto
  ): Promise<PortfolioOptimizationDto> {
    this.logger.log(`Generating optimization suggestions for user ${userId}`);

    const assets = await this.portfolioAssetRepository.find({
      where: { userId, isHidden: false },
    });

    const portfolio = await this.portfolioService.getUserPortfolio(userId, {});
    const totalValue = parseFloat(portfolio.totalValueUsd);

    // Simple optimization based on current allocation
    const suggestedAllocation: Record<string, number> = {};
    const rebalancingRecommendations: string[] = [];

    let totalAllocation = 0;
    for (const asset of assets) {
      if (!asset.symbol) continue;

      const currentValue = parseFloat(asset.balance || '0');
      const currentWeight = totalValue > 0 ? currentValue / totalValue : 0;

      // Simple equal-weight strategy (could be enhanced with more sophisticated algorithms)
      const suggestedWeight = 1 / assets.length;
      suggestedAllocation[asset.assetAddress] = suggestedWeight;
      totalAllocation += suggestedWeight;

      const weightDiff = suggestedWeight - currentWeight;
      if (Math.abs(weightDiff) > 0.05) { // 5% threshold
        const action = weightDiff > 0 ? 'Increase' : 'Reduce';
        const percentage = Math.abs(weightDiff * 100).toFixed(1);
        rebalancingRecommendations.push(
          `${action} ${asset.symbol} allocation by ${percentage}%`
        );
      }
    }

    return {
      suggestedAllocation,
      expectedReturnImprovement: 0.02, // Placeholder
      riskReduction: 0.01, // Placeholder
      rebalancingRecommendations,
    };
  }

  async calculateBenchmarkComparison(
    userId: string, 
    query: PortfolioAnalyticsQueryDto
  ): Promise<any> {
    this.logger.log(`Calculating benchmark comparison for user ${userId}`);

    const snapshots = await this.getHistoricalSnapshots(userId, query.period);
    const portfolioReturns = RiskCalculationsUtil.calculateDailyReturns(
      snapshots.map(s => parseFloat(s.totalValueUsd))
    );

    // Mock market returns (would need real market data)
    const marketReturns = portfolioReturns.map(() => (Math.random() - 0.5) * 0.02);

    const beta = RiskCalculationsUtil.calculateBeta(portfolioReturns, marketReturns);
    const portfolioVolatility = RiskCalculationsUtil.calculateVolatility(portfolioReturns);
    const marketVolatility = RiskCalculationsUtil.calculateVolatility(marketReturns);

    return {
      beta,
      portfolioVolatility,
      marketVolatility,
      excessReturn: portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length - 
                   marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length,
      informationRatio: 0, // Would need benchmark data
    };
  }

  async calculatePerformanceAttribution(
    userId: string, 
    snapshots: PortfolioSnapshot[]
  ): Promise<any> {
    this.logger.log(`Calculating performance attribution for user ${userId}`);

    if (snapshots.length < 2) {
      return {
        allocationEffect: 0,
        selectionEffect: 0,
        interactionEffect: 0,
        totalEffect: 0,
      };
    }

    // Simplified performance attribution (Brinson model)
    const totalEffect = this.calculateTotalEffect(snapshots);
    
    return {
      allocationEffect: totalEffect * 0.4, // Placeholder
      selectionEffect: totalEffect * 0.4, // Placeholder
      interactionEffect: totalEffect * 0.2, // Placeholder
      totalEffect,
    };
  }

  private async getHistoricalSnapshots(userId: string, period?: string): Promise<PortfolioSnapshot[]> {
    const days = this.getDaysFromPeriod(period);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.portfolioSnapshotRepository.find({
      where: { userId, timestamp: { $gte: cutoffDate } as any },
      order: { timestamp: 'ASC' },
    });
  }

  private getDaysFromPeriod(period?: string): number {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }

  private calculatePeriodReturn(snapshots: PortfolioSnapshot[], days: number): number {
    if (snapshots.length < 2) return 0;

    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);

    const recentSnapshots = snapshots.filter(s => s.timestamp >= cutoff);
    if (recentSnapshots.length < 2) return 0;

    const startValue = parseFloat(recentSnapshots[0].totalValueUsd);
    const endValue = parseFloat(recentSnapshots[recentSnapshots.length - 1].totalValueUsd);

    return RiskCalculationsUtil.calculateTotalReturn(startValue, endValue);
  }

  private calculateYTDReturn(snapshots: PortfolioSnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const currentYear = new Date().getFullYear();
    const ytdSnapshots = snapshots.filter(s => s.timestamp.getFullYear() === currentYear);
    
    if (ytdSnapshots.length < 2) return 0;

    const startValue = parseFloat(ytdSnapshots[0].totalValueUsd);
    const endValue = parseFloat(ytdSnapshots[ytdSnapshots.length - 1].totalValueUsd);

    return RiskCalculationsUtil.calculateTotalReturn(startValue, endValue);
  }

  private calculateAssetCorrelation(asset: PortfolioAsset, allAssets: PortfolioAsset[]): number {
    // Simplified correlation calculation
    // In a real implementation, you would need historical price data for each asset
    if (!asset.symbol) return 0;

    // Mock correlation based on asset type and symbol
    if (asset.assetType === AssetType.TOKEN) {
      if (asset.symbol.includes('USDC') || asset.symbol.includes('USDT')) {
        return 0.1; // Low correlation for stablecoins
      }
      return 0.7; // High correlation for other tokens
    } else {
      return 0.3; // Lower correlation for NFTs
    }
  }

  private calculateTotalEffect(snapshots: PortfolioSnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const startValue = parseFloat(snapshots[0].totalValueUsd);
    const endValue = parseFloat(snapshots[snapshots.length - 1].totalValueUsd);

    return RiskCalculationsUtil.calculateTotalReturn(startValue, endValue);
  }
} 