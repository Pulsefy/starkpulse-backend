import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staking } from '../entities/staking.entity';
import { GovernanceToken } from '../entities/governance-token.entity';
import { IStakingService } from '../interfaces/governance.interface';

@Injectable()
export class StakingService implements IStakingService {
  constructor(
    @InjectRepository(Staking)
    private readonly stakingRepository: Repository<Staking>,
    @InjectRepository(GovernanceToken)
    private readonly tokenRepository: Repository<GovernanceToken>,
  ) {}

  async stakeTokens(userId: string, amount: number, lockPeriodDays = 14): Promise<Staking> {
    // Check if user has sufficient tokens
    const token = await this.tokenRepository.findOne({
      where: { userId, tokenType: 'GOVERNANCE' }
    });

    if (!token || token.balance < amount) {
      throw new BadRequestException('Insufficient token balance');
    }

    // Update token balance
    token.balance -= amount;
    token.stakedBalance += amount;
    await this.tokenRepository.save(token);

    // Create staking record
    const staking = this.stakingRepository.create({
      userId,
      stakedAmount: amount,
      lockPeriodDays,
      stakedAt: new Date(),
      canUnstakeAt: new Date(Date.now() + lockPeriodDays * 24 * 60 * 60 * 1000),
      apy: this.calculateAPY(lockPeriodDays),
    });

    return await this.stakingRepository.save(staking);
  }

  async unstakeTokens(stakingId: string): Promise<Staking> {
    const staking = await this.stakingRepository.findOne({
      where: { id: stakingId }
    });

    if (!staking) {
      throw new NotFoundException('Staking record not found');
    }

    if (staking.status !== 'ACTIVE') {
      throw new BadRequestException('Staking is not active');
    }

    const now = new Date();
    if (now < staking.canUnstakeAt) {
      // Request unstaking (start cooldown period)
      staking.status = 'UNSTAKING';
      staking.unstakeRequestedAt = now;
      return await this.stakingRepository.save(staking);
    }

    // Complete unstaking
    const token = await this.tokenRepository.findOne({
      where: { userId: staking.userId, tokenType: 'GOVERNANCE' }
    });

    if (token) {
      token.balance += staking.stakedAmount;
      token.stakedBalance -= staking.stakedAmount;
      await this.tokenRepository.save(token);
    }

    staking.status = 'UNSTAKED';
    return await this.stakingRepository.save(staking);
  }

  async delegateStake(stakingId: string, delegateId: string): Promise<Staking> {
    const staking = await this.stakingRepository.findOne({
      where: { id: stakingId }
    });

    if (!staking) {
      throw new NotFoundException('Staking record not found');
    }

    if (staking.status !== 'ACTIVE') {
      throw new BadRequestException('Can only delegate active stakes');
    }

    staking.delegatedTo = delegateId;
    return await this.stakingRepository.save(staking);
  }

  async undelegateStake(stakingId: string): Promise<Staking> {
    const staking = await this.stakingRepository.findOne({
      where: { id: stakingId }
    });

    if (!staking) {
      throw new NotFoundException('Staking record not found');
    }

    staking.delegatedTo = null;
    return await this.stakingRepository.save(staking);
  }

  async calculateRewards(stakingId: string): Promise<number> {
    const staking = await this.stakingRepository.findOne({
      where: { id: stakingId }
    });

    if (!staking || staking.status !== 'ACTIVE') {
      return 0;
    }

    const now = new Date();
    const stakingDuration = now.getTime() - staking.stakedAt.getTime();
    const stakingDays = stakingDuration / (24 * 60 * 60 * 1000);

    // Calculate rewards based on staked amount, APY, and time
    const annualReward = (staking.stakedAmount * staking.apy) / 100;
    const dailyReward = annualReward / 365;
    const totalRewards = dailyReward * stakingDays;

    return Math.max(0, totalRewards - staking.rewardsClaimed);
  }

  async claimRewards(stakingId: string): Promise<number> {
    const pendingRewards = await this.calculateRewards(stakingId);

    if (pendingRewards <= 0) {
      return 0;
    }

    const staking = await this.stakingRepository.findOne({
      where: { id: stakingId }
    });

    // Add rewards to user's token balance
    const token = await this.tokenRepository.findOne({
      where: { userId: staking.userId, tokenType: 'REWARD' }
    });

    if (token) {
      token.balance += pendingRewards;
      await this.tokenRepository.save(token);
    }

    // Update staking record
    staking.rewardsClaimed += pendingRewards;
    staking.pendingRewards = 0;
    await this.stakingRepository.save(staking);

    return pendingRewards;
  }

  async getStakingInfo(userId: string): Promise<Staking[]> {
    return await this.stakingRepository.find({
      where: { userId },
      relations: ['delegate'],
      order: { createdAt: 'DESC' },
    });
  }

  private calculateAPY(lockPeriodDays: number): number {
    // Base APY calculation - longer lock periods get higher APY
    const baseAPY = 5; // 5% base APY
    const lockBonus = Math.min(lockPeriodDays / 365, 1) * 10; // Up to 10% bonus for 1 year lock
    return baseAPY + lockBonus;
  }
}
