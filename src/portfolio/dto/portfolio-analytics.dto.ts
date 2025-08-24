import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class PortfolioAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsNumber()
  riskFreeRate?: number;

  @IsOptional()
  @IsNumber()
  confidenceLevel?: number;
}

export class RiskMetricsDto {
  var: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  beta: number;
  sortinoRatio: number;
}

export class PerformanceMetricsDto {
  totalReturn: number;
  annualizedReturn: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  ytdReturn: number;
}

export class AssetCorrelationDto {
  assetAddress: string;
  symbol: string;
  correlation: number;
  weight: number;
}

export class PortfolioOptimizationDto {
  suggestedAllocation: Record<string, number>;
  expectedReturnImprovement: number;
  riskReduction: number;
  rebalancingRecommendations: string[];
}

export class PortfolioAnalyticsSummaryDto {
  currentValue: number;
  riskMetrics: RiskMetricsDto;
  performanceMetrics: PerformanceMetricsDto;
  correlations: AssetCorrelationDto[];
  lastUpdated: Date;
} 