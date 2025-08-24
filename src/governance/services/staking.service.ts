import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stake } from '../entities/stake.entity';
import { BlockchainService } from '../../blockchain/services/blockchain.service';
import { StakeTokenDto } from '../dto/stake-token.dto';
import { UnstakeTokenDto } from '../dto/unstake-token.dto';

@Injectable()
export class StakingService {
  constructor(
    @InjectRepository(Stake)
    private stakeRepository: Repository<Stake>,
    private blockchainService: BlockchainService,
  ) {}

  async stakeTokens(stakeTokenDto: StakeTokenDto, userId: string) {
    const { amount, lockupPeriodDays } = stakeTokenDto;
    
    // Validate user has enough tokens
    const walletAddress = await this.getUserWalletAddress(userId);
    const userBalance = await this.blockchainService.getTokenBalance(walletAddress);
    
    if (userBalance < amount) {
      throw new BadRequestException('Insufficient token balance');
    }
    
    // Calculate lockup end time
    const lockupEndTime = new Date();
    lockupEndTime.setDate(lockupEndTime.getDate() + lockupPeriodDays);
    
    // Create stake record
    const stake = this.stakeRepository.create({
      user: { id: userId },
      amount,
      lockupEndTime,
    });
    
    // Execute staking transaction on blockchain
    const txHash = await this.blockchainService.stakeTokens(walletAddress, amount, lockupPeriodDays);
    stake.stakeTransactionHash = txHash;
    
    return this.stakeRepository.save(stake);
  }

  async unstakeTokens(unstakeTokenDto: UnstakeTokenDto, userId: string) {
    const { stakeId } = unstakeTokenDto;
    
    // Find stake record
    const stake = await this.stakeRepository.findOne({
      where: {
        id: stakeId,
        user: { id: userId },
        isUnstaked: false,
      },
    });
    
    if (!stake) {
      throw new BadRequestException('Stake not found or already unstaked');
    }
    
    // Check if lockup period has ended
    if (new Date() < stake.lockupEndTime) {
      throw new BadRequestException('Tokens are still locked');
    }
    
    // Execute unstaking transaction on blockchain
    const walletAddress = await this.getUserWalletAddress(userId);
    const txHash = await this.blockchainService.unstakeTokens(walletAddress, stake.stakeTransactionHash);
    
    // Update stake record
    stake.isUnstaked = true;
    stake.unstakeTransactionHash = txHash;
    
    return this.stakeRepository.save(stake);
  }

  async getUserStakes(userId: string) {
    return this.stakeRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async calculateStakingRewards() {
    const activeStakes = await this.stakeRepository.find({
      where: { isUnstaked: false },
    });
    
    for (const stake of activeStakes) {
      // Calculate reward based on staking duration and amount
      const stakingDuration = this.calculateStakingDuration(stake.createdAt);
      const rewardRate = this.getRewardRate(stakingDuration);
      const reward = Number(stake.amount) * rewardRate;
      
      // Update stake with earned reward
      stake.rewardEarned += reward;
      await this.stakeRepository.save(stake);
    }
  }

  async getTotalStakedAmount() {
    const result = await this.stakeRepository
      .createQueryBuilder('stake')
      .where('stake.isUnstaked = :isUnstaked', { isUnstaked: false })
      .select('SUM(stake.amount)', 'total')
      .getRawOne();
    
    return result?.total || 0;
  }

  private calculateStakingDuration(stakeDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - stakeDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private getRewardRate(stakingDuration: number): number {
    // Implement tiered reward rates based on staking duration
    if (stakingDuration > 365) return 0.15; // 15% for > 1 year
    if (stakingDuration > 180) return 0.10; // 10% for > 6 months
    if (stakingDuration > 90) return 0.05; // 5% for > 3 months
    if (stakingDuration > 30) return 0.02; // 2% for > 1 month
    return 0.01; // 1% for < 1 month
  }

  private async getUserWalletAddress(userId: string): Promise<string> {
    // This would typically come from a user service
    // For now, we'll return a mock address
    return `0x${userId.substring(0, 40)}`;
  }
}