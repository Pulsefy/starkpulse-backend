import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PortfolioSnapshot } from '../portfolio/entities/portfolio.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PortfolioSnapshot)
    private snapshotRepo: Repository<PortfolioSnapshot>,
  ) {}

  async getAnalytics(userId: number) {
    const snapshots = await this.snapshotRepo.find({
      where: { user: { id: userId.toString() } },
      order: { timestamp: 'ASC' },
    });

    if (snapshots.length < 2) return null;

    const initial = snapshots[0].totalValue;
    const latest = snapshots[snapshots.length - 1].totalValue;

    const roi = ((latest - initial) / initial) * 100;

    const dailyReturns: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1].totalValue;
      const curr = snapshots[i].totalValue;
      dailyReturns.push((curr - prev) / prev);
    }

    const volatility =
      Math.sqrt(
        dailyReturns.reduce((acc, r) => acc + Math.pow(r - roi / 100, 2), 0) /
          dailyReturns.length,
      ) * 100;

    return {
      roi: roi.toFixed(2),
      volatility: volatility.toFixed(2),
      snapshots,
    };
  }
}
