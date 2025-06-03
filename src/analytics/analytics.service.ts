import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioSnapshot } from 'src/portfolio/entities/portfolio-snapshot.entity';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PortfolioSnapshot)
    private readonly snapshotRepo: Repository<PortfolioSnapshot>,
  ) {}


  async getUserAnalytics(userId: string): Promise<AnalyticsResponseDto | null> {
    const snapshots = await this.snapshotRepo.find({
      where: { userId },
      order: { timestamp: 'ASC' },
    });

    if (snapshots.length < 2) {
      return null;
    }

    // Parse the first and last totalValueUsd as floats
    const initialValue = parseFloat(snapshots[0].totalValueUsd);
    const latestValue = parseFloat(
      snapshots[snapshots.length - 1].totalValueUsd,
    );
    // ROI % = (latest – initial) / initial * 100
    const roiPct = ((latestValue - initialValue) / initialValue) * 100;

    // Build daily returns array: (today – yesterday) / yesterday
    const dailyReturns: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prevValue = parseFloat(snapshots[i - 1].totalValueUsd);
      const currValue = parseFloat(snapshots[i].totalValueUsd);
      if (prevValue > 0) {
        dailyReturns.push((currValue - prevValue) / prevValue);
      }
    }

    // Compute average daily return
    const avgDailyReturn =
      dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;

    // Compute daily standard deviation, then annualize (×√252) and convert to percentage
    const variance =
      dailyReturns.reduce(
        (acc, r) => acc + Math.pow(r - avgDailyReturn, 2),
        0,
      ) / dailyReturns.length;
    const dailyStdDev = Math.sqrt(variance);
    const annualizedVolatilityPct = dailyStdDev * Math.sqrt(252) * 100;

    // Compute short-term percent changes:
    const dailyChange = this.computePercentChange(snapshots, 1);
    const weeklyChange = this.computePercentChange(snapshots, 7);
    const monthlyChange = this.computePercentChange(snapshots, 30);

    // Build the final response DTO
    const response: AnalyticsResponseDto = {
      roi: roiPct.toFixed(2),
      volatility: annualizedVolatilityPct.toFixed(2),
      dailyChange,
      weeklyChange,
      monthlyChange,
      // Return the raw snapshots as an array of plain objects
      snapshots: snapshots.map((s) => ({
        id: s.id,
        userId: s.userId,
        totalValueUsd: s.totalValueUsd,
        assetBreakdown: s.assetBreakdown,
        timestamp: s.timestamp,
      })),
    };

    return response;
  }

  /**
   * Find the snapshot closest to (now – daysAgo).
   * If none exists before that cutoff, returns '0.00'.
   * Otherwise: (latestValue – pastValue) / pastValue * 100, formatted to 2 decimals.
   */
  private computePercentChange(
    snapshots: PortfolioSnapshot[],
    daysAgo: number,
  ): string {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - daysAgo);

    // Walk from the end backwards until we find the most recent snapshot ≤ cutoff
    const reversed = [...snapshots].reverse();
    const pastSnap = reversed.find((s) => s.timestamp <= cutoff);

    if (!pastSnap) {
      return '0.00';
    }

    const pastValue = parseFloat(pastSnap.totalValueUsd);
    const latestValue = parseFloat(
      snapshots[snapshots.length - 1].totalValueUsd,
    );

    if (pastValue === 0) {
      return '0.00';
    }

    const changePct = ((latestValue - pastValue) / pastValue) * 100;
    return changePct.toFixed(2);
  }
}
