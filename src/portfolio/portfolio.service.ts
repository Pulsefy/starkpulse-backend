/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';
import { User } from '../auth/entities/user.entity';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioSnapshot)
    private snapshotRepo: Repository<PortfolioSnapshot>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // Example calculation, you'll likely fetch from holdings/assets table
  private async calculateUserPortfolioValue(
    user: User,
  ): Promise<{ total: number; breakdown: Record<string, number> }> {
    // Placeholder logic — replace with real asset values
    const assets = {
      BTC: 0.5,
      ETH: 2.0,
    };

    const prices = {
      BTC: 50000,
      ETH: 2000,
    };

    let total = 0;
    for (const [symbol, quantity] of Object.entries(assets)) {
      total += quantity * prices[symbol];
    }

    return { total, breakdown: assets };
  }

  @Cron('0 * * * *') // Every hour
  async recordSnapshots() {
    const users = await this.userRepo.find();

    for (const user of users) {
      const { total, breakdown } = await this.calculateUserPortfolioValue(user);

      const snapshot = this.snapshotRepo.create({
        user,
        totalValueUsd: total.toString(),
        assetBreakdown: breakdown,
      });

      await this.snapshotRepo.save(snapshot);
    }
  }

  async create(createDto: CreatePortfolioDto) {
    const user = await this.userRepo.findOneBy({
      id: String(createDto.userId),
    });

    if (!user) throw new NotFoundException('User not found');

    const snapshot = this.snapshotRepo.create({
      user,
      totalValueUsd: createDto.totalValue.toString(),
      assetBreakdown: createDto.assetBreakdown,
    });

    return this.snapshotRepo.save(snapshot);
  }

  async findAll() {
    return this.snapshotRepo.find({ relations: ['user'] });
  }

  async findOne(id: string) {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!snapshot) throw new NotFoundException('Snapshot not found');
    return snapshot;
  }

  async update(id: string, updateDto: UpdatePortfolioDto) {
    const snapshot = await this.snapshotRepo.findOneBy({ id });
    if (!snapshot) throw new NotFoundException('Snapshot not found');

    Object.assign(snapshot, updateDto);
    return this.snapshotRepo.save(snapshot);
  }

  async remove(id: string) {
    const result = await this.snapshotRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Snapshot not found');
    return { message: 'Deleted successfully' };
  }

  async getUserAnalytics(userId: string): Promise<any> {
    // Get user's portfolio
    const portfolio = await this.getUserPortfolio(userId);

    // Calculate total value
    const totalValue = portfolio.reduce(
      (sum, asset) => sum + asset.valueUsd,
      0,
    );

    // Get historical data
    const historicalData = await this.getHistoricalPortfolioValue(userId);

    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(historicalData);

    return {
      totalValue,
      assetCount: portfolio.length,
      performance,
      historicalData,
    };
  }

  private calculatePerformanceMetrics(historicalData: any[]): any {
    if (historicalData.length < 2) {
      return {
        dailyChange: 0,
        weeklyChange: 0,
        monthlyChange: 0,
      };
    }

    const latest = historicalData[historicalData.length - 1].value;
    const yesterday = historicalData[historicalData.length - 2].value;

    // Find data points for week and month ago
    const weekAgoIndex = historicalData.findIndex(
      (data) =>
        new Date(data.date) <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
    const monthAgoIndex = historicalData.findIndex(
      (data) =>
        new Date(data.date) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );

    const weekAgo =
      weekAgoIndex >= 0 ? historicalData[weekAgoIndex].value : latest;
    const monthAgo =
      monthAgoIndex >= 0 ? historicalData[monthAgoIndex].value : latest;

    return {
      dailyChange: yesterday ? ((latest - yesterday) / yesterday) * 100 : 0,
      weeklyChange: weekAgo ? ((latest - weekAgo) / weekAgo) * 100 : 0,
      monthlyChange: monthAgo ? ((latest - monthAgo) / monthAgo) * 100 : 0,
    };
  }

  async getUserPortfolio(userId: string): Promise<any[]> {
    // Implementation needed - placeholder for now
    return []; // Return empty array as placeholder
  }

  async getHistoricalPortfolioValue(userId: string): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Set default to 30 days

    const snapshots = await this.snapshotRepo.find({
      where: {
        user: { id: userId },
        createdAt: MoreThanOrEqual(startDate),
      },
      order: { createdAt: 'ASC' },
    });

    if (!snapshots.length) throw new NotFoundException('No snapshots found');

    return snapshots.map((snapshot) => ({
      date: snapshot.createdAt,
      value: parseFloat(snapshot.totalValueUsd),
    }));
  }

  async getPortfolioHistory(userId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.snapshotRepo.find({
      where: {
        user: { id: userId },
        createdAt: MoreThanOrEqual(startDate),
      },
      order: { createdAt: 'ASC' },
    });

    if (!snapshots.length) throw new NotFoundException('No snapshots found');

    const values = snapshots.map((s) => parseFloat(s.totalValueUsd));
    const initial = values[0];
    const latest = values[values.length - 1];

    const roi = this.calculateROI(initial, latest);
    const volatility = this.calculateVolatility(values);
    const twr = this.calculateTimeWeightedReturn(values);

    // Example benchmark (BTC)
    const benchmark = {
      name: 'Bitcoin',
      roi: this.calculateROI(30000, 50000), // simulate BTC from $30k to $50k
    };

    return snapshots.map((s) => ({
      date: s.createdAt,
      value: parseFloat(s.totalValueUsd),
    }));
  }

  // Utility functions for performance calculations
  private calculateROI(initial: number, final: number): number {
    if (initial === 0) return 0;
    return ((final - initial) / initial) * 100;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }

  private calculateTimeWeightedReturn(values: number[]): number {
    if (values.length < 2) return 0;

    let twr = 1;
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        twr *= 1 + (values[i] - values[i - 1]) / values[i - 1];
      }
    }
    return (twr - 1) * 100;
  }
}
