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

  async getUserAnalytics(userId: string, skip = 0, take = 1000): Promise<AnalyticsResponseDto[] | null> {
    const snapshots = await this.snapshotRepo.find({
      where: { userId },
      order: { timestamp: 'ASC' },
      skip,
      take,
    });

    if (snapshots.length < 2) {
      return null;
    }

    // Group snapshots by chain
    const chainGroups: Record<string, typeof snapshots> = {};
    for (const snap of snapshots) {
      if (!chainGroups[snap.chain]) chainGroups[snap.chain] = [];
      chainGroups[snap.chain].push(snap);
    }

    // Compute analytics for each chain
    const results: AnalyticsResponseDto[] = [];
    for (const chain of Object.keys(chainGroups)) {
      const chainSnaps = chainGroups[chain];
      if (chainSnaps.length < 2) continue;
      const initialValue = parseFloat(chainSnaps[0].totalValueUsd);
      const latestValue = parseFloat(chainSnaps[chainSnaps.length - 1].totalValueUsd);
      const roiPct = ((latestValue - initialValue) / initialValue) * 100;
      const dailyReturns: number[] = [];
      for (let i = 1; i < chainSnaps.length; i++) {
        const prevValue = parseFloat(chainSnaps[i - 1].totalValueUsd);
        const currValue = parseFloat(chainSnaps[i].totalValueUsd);
        if (prevValue > 0) {
          dailyReturns.push((currValue - prevValue) / prevValue);
        }
      }
      const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((acc, r) => acc + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length;
      const dailyStdDev = Math.sqrt(variance);
      const annualizedVolatilityPct = dailyStdDev * Math.sqrt(252) * 100;
      const dailyChange = this.computePercentChange(chainSnaps, 1);
      const weeklyChange = this.computePercentChange(chainSnaps, 7);
      const monthlyChange = this.computePercentChange(chainSnaps, 30);
      results.push({
        roi: roiPct.toFixed(2),
        volatility: annualizedVolatilityPct.toFixed(2),
        dailyChange,
        weeklyChange,
        monthlyChange,
        snapshots: chainSnaps.map((s) => ({
          id: s.id,
          userId: s.userId,
          totalValueUsd: s.totalValueUsd,
          assetBreakdown: s.assetBreakdown,
          timestamp: s.timestamp,
        })),
        chain,
      } as any);
    }
    return results.length ? results : null;
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
