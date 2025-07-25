import { Chain } from '../../blockchain/enums/chain.enum';

export class AnalyticsResponseDto {
  chain: Chain;
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
