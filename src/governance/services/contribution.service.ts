import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contribution } from '../entities/contribution.entity';
import { GovernanceToken } from '../entities/governance-token.entity';
import { IContributionService } from '../interfaces/governance.interface';
import { CreateContributionDto, ReviewContributionDto, ContributionFilterDto, ContributionStatsDto } from '../dto/contribution.dto';

@Injectable()
export class ContributionService implements IContributionService {
  constructor(
    @InjectRepository(Contribution)
    private readonly contributionRepository: Repository<Contribution>,
    @InjectRepository(GovernanceToken)
    private readonly tokenRepository: Repository<GovernanceToken>,
  ) {}

  async createContribution(userId: string, dto: CreateContributionDto): Promise<Contribution> {
    const contribution = this.contributionRepository.create({
      ...dto,
      userId,
    });

    return await this.contributionRepository.save(contribution);
  }

  async reviewContribution(id: string, reviewerId: string, dto: ReviewContributionDto): Promise<Contribution> {
    const contribution = await this.getContribution(id);

    if (contribution.status !== 'PENDING') {
      throw new BadRequestException('Only pending contributions can be reviewed');
    }

    const finalScore = dto.baseScore ? dto.baseScore * (dto.multiplier || 1) : 0;
    const tokenReward = dto.tokenReward || this.calculateTokenReward(finalScore);

    await this.contributionRepository.update(id, {
      ...dto,
      finalScore,
      tokenReward,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    });

    // Process rewards if approved
    if (dto.status === 'APPROVED') {
      await this.processRewards(id);
    }

    return this.getContribution(id);
  }

  async getContribution(id: string): Promise<Contribution> {
    const contribution = await this.contributionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    return contribution;
  }

  async getContributions(filter: ContributionFilterDto): Promise<{ contributions: Contribution[]; total: number }> {
    const queryBuilder = this.contributionRepository.createQueryBuilder('contribution')
      .leftJoinAndSelect('contribution.user', 'user');

    if (filter.userId) {
      queryBuilder.andWhere('contribution.userId = :userId', { userId: filter.userId });
    }

    if (filter.type) {
      queryBuilder.andWhere('contribution.type = :type', { type: filter.type });
    }

    if (filter.status) {
      queryBuilder.andWhere('contribution.status = :status', { status: filter.status });
    }

    if (filter.dateFrom) {
      queryBuilder.andWhere('contribution.createdAt >= :dateFrom', { dateFrom: filter.dateFrom });
    }

    if (filter.dateTo) {
      queryBuilder.andWhere('contribution.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'DESC';
    queryBuilder.orderBy(`contribution.${sortBy}`, sortOrder);

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [contributions, total] = await queryBuilder.getManyAndCount();

    return { contributions, total };
  }

  async getContributionStats(userId: string): Promise<ContributionStatsDto> {
    const contributions = await this.contributionRepository.find({
      where: { userId },
    });

    const totalContributions = contributions.length;
    const approvedContributions = contributions.filter(c => c.status === 'APPROVED').length;
    const totalScore = contributions.reduce((sum, c) => sum + c.finalScore, 0);
    const totalTokensEarned = contributions.reduce((sum, c) => sum + c.tokenReward, 0);

    // Group by type
    const contributionsByType: Record<string, number> = {};
    contributions.forEach(contribution => {
      contributionsByType[contribution.type] = (contributionsByType[contribution.type] || 0) + 1;
    });

    // Monthly stats for the last 12 months
    const monthlyStats = this.calculateMonthlyStats(contributions);

    return {
      totalContributions,
      approvedContributions,
      totalScore,
      totalTokensEarned,
      contributionsByType,
      monthlyStats,
    };
  }

  async processRewards(contributionId: string): Promise<boolean> {
    const contribution = await this.getContribution(contributionId);

    if (contribution.status !== 'APPROVED' || contribution.isRewarded) {
      return false;
    }

    // Get or create user's token record
    let token = await this.tokenRepository.findOne({
      where: { userId: contribution.userId, tokenType: 'REWARD' }
    });

    if (!token) {
      token = this.tokenRepository.create({
        userId: contribution.userId,
        tokenType: 'REWARD',
        balance: 0,
      });
    }

    // Add reward tokens
    token.balance += contribution.tokenReward;
    await this.tokenRepository.save(token);

    // Mark contribution as rewarded
    await this.contributionRepository.update(contributionId, {
      status: 'REWARDED',
      isRewarded: true,
      rewardedAt: new Date(),
    });

    return true;
  }

  async calculateContributionScore(contribution: Contribution): Promise<number> {
    // Base scoring system - can be enhanced with more complex logic
    const baseScores = {
      CODE_COMMIT: 100,
      BUG_REPORT: 50,
      FEATURE_REQUEST: 30,
      DOCUMENTATION: 40,
      COMMUNITY_HELP: 20,
      GOVERNANCE_PARTICIPATION: 80,
      REFERRAL: 25,
      CONTENT_CREATION: 60,
      TESTING: 70,
      TRANSLATION: 45,
    };

    return baseScores[contribution.type] || 10;
  }

  private calculateTokenReward(score: number): number {
    // Convert score to token reward (1 score = 0.1 tokens)
    return score * 0.1;
  }

  private calculateMonthlyStats(contributions: Contribution[]): Array<{
    month: string;
    contributions: number;
    tokensEarned: number;
  }> {
    const monthlyStats = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format

      const monthContributions = contributions.filter(c => {
        const contributionMonth = c.createdAt.toISOString().substring(0, 7);
        return contributionMonth === monthKey;
      });

      monthlyStats.push({
        month: monthKey,
        contributions: monthContributions.length,
        tokensEarned: monthContributions.reduce((sum, c) => sum + c.tokenReward, 0),
      });
    }

    return monthlyStats;
  }
}
