import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stake } from '../entities/stake.entity';
import { Delegation } from '../entities/delegation.entity';
import { BlockchainService } from '../../blockchain/services/blockchain.service';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Stake)
    private stakeRepository: Repository<Stake>,
    @InjectRepository(Delegation)
    private delegationRepository: Repository<Delegation>,
    private blockchainService: BlockchainService,
  ) {}

  async getUserTokenBalance(userId: string): Promise<number> {
    // Get user's wallet address from user service
    const walletAddress = await this.getUserWalletAddress(userId);
    
    if (!walletAddress) {
      return 0;
    }
    
    // Get token balance from blockchain
    return this.blockchainService.getTokenBalance(walletAddress);
  }

  async getUserStakedAmount(userId: string): Promise<number> {
    const stakes = await this.stakeRepository.find({
      where: {
        user: { id: userId },
        isUnstaked: false,
      },
    });
    
    return stakes.reduce((total, stake) => total + Number(stake.amount), 0);
  }

  async getUserDelegatedVotingPower(userId: string): Promise<number> {
    const delegations = await this.delegationRepository.find({
      where: {
        delegate: { id: userId },
        isActive: true,
      },
    });
    
    return delegations.reduce((total, delegation) => total + Number(delegation.amount), 0);
  }

  async transferTokens(fromUserId: string, toUserId: string, amount: number) {
    const fromWalletAddress = await this.getUserWalletAddress(fromUserId);
    const toWalletAddress = await this.getUserWalletAddress(toUserId);
    
    if (!fromWalletAddress || !toWalletAddress) {
      throw new Error('Wallet address not found');
    }
    
    return this.blockchainService.transferTokens(fromWalletAddress, toWalletAddress, amount);
  }

  async rewardUserContribution(userId: string, contributionScore: number) {
    const walletAddress = await this.getUserWalletAddress(userId);
    
    if (!walletAddress) {
      throw new Error('Wallet address not found');
    }
    
    // Calculate token reward based on contribution score
    const tokenReward = this.calculateTokenReward(contributionScore);
    
    // Mint tokens to user's wallet
    return this.blockchainService.mintTokens(walletAddress, tokenReward);
  }

  private calculateTokenReward(contributionScore: number): number {
    // Implement reward calculation algorithm
    // This is a simple linear model, but could be more complex
    const baseReward = 10;
    const multiplier = 0.5;
    
    return baseReward + (contributionScore * multiplier);
  }

  private async getUserWalletAddress(userId: string): Promise<string> {
    // This would typically come from a user service
    // For now, we'll return a mock address
    return `0x${userId.substring(0, 40)}`;
  }
}