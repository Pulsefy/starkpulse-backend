export class AnalyticsResponseDto {

  roi: string;

  volatility: string;

  
  dailyChange: string;

  weeklyChange: string;

  monthlyChange: string;

  snapshots: {
    id: string;
    userId: string;
    totalValueUsd: string;
    assetBreakdown: Record<string, any>;
    timestamp: Date;
  }[];
}
