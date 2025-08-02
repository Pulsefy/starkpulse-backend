import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StakingService } from '../services/staking.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Staking')
@Controller('governance/staking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post('stake')
  @ApiOperation({ summary: 'Stake governance tokens' })
  @ApiResponse({ status: 201, description: 'Tokens staked successfully' })
  async stakeTokens(
    @Request() req,
    @Body() body: { amount: number; lockPeriodDays?: number }
  ) {
    return await this.stakingService.stakeTokens(
      req.user.id,
      body.amount,
      body.lockPeriodDays
    );
  }

  @Post(':id/unstake')
  @ApiOperation({ summary: 'Unstake tokens' })
  @ApiResponse({ status: 200, description: 'Unstaking process initiated' })
  async unstakeTokens(@Param('id') stakingId: string) {
    return await this.stakingService.unstakeTokens(stakingId);
  }

  @Post(':id/delegate')
  @ApiOperation({ summary: 'Delegate staked tokens' })
  @ApiResponse({ status: 200, description: 'Delegation successful' })
  async delegateStake(
    @Param('id') stakingId: string,
    @Body() body: { delegateId: string }
  ) {
    return await this.stakingService.delegateStake(stakingId, body.delegateId);
  }

  @Post(':id/undelegate')
  @ApiOperation({ summary: 'Undelegate staked tokens' })
  @ApiResponse({ status: 200, description: 'Undelegation successful' })
  async undelegateStake(@Param('id') stakingId: string) {
    return await this.stakingService.undelegateStake(stakingId);
  }

  @Get(':id/rewards')
  @ApiOperation({ summary: 'Calculate pending rewards' })
  @ApiResponse({ status: 200, description: 'Rewards calculated successfully' })
  async calculateRewards(@Param('id') stakingId: string) {
    const pendingRewards = await this.stakingService.calculateRewards(stakingId);
    return {
      stakingId,
      pendingRewards,
      canClaim: pendingRewards > 0
    };
  }

  @Post(':id/claim-rewards')
  @ApiOperation({ summary: 'Claim staking rewards' })
  @ApiResponse({ status: 200, description: 'Rewards claimed successfully' })
  async claimRewards(@Param('id') stakingId: string) {
    const claimedAmount = await this.stakingService.claimRewards(stakingId);
    return {
      stakingId,
      claimedAmount,
      success: claimedAmount > 0
    };
  }

  @Get('positions')
  @ApiOperation({ summary: 'Get user staking positions' })
  @ApiResponse({ status: 200, description: 'Staking positions retrieved successfully' })
  async getStakingPositions(@Request() req) {
    const stakingInfo = await this.stakingService.getStakingInfo(req.user.id);
    
    // Calculate totals
    const totalStaked = stakingInfo
      .filter(s => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + s.stakedAmount, 0);
    
    const totalRewardsClaimed = stakingInfo
      .reduce((sum, s) => sum + s.rewardsClaimed, 0);

    // Calculate total pending rewards
    const pendingRewardsPromises = stakingInfo
      .filter(s => s.status === 'ACTIVE')
      .map(s => this.stakingService.calculateRewards(s.id));
    
    const pendingRewardsArray = await Promise.all(pendingRewardsPromises);
    const totalPendingRewards = pendingRewardsArray.reduce((sum, reward) => sum + reward, 0);

    return {
      positions: stakingInfo,
      summary: {
        totalStaked,
        totalRewardsClaimed,
        totalPendingRewards,
        activePositions: stakingInfo.filter(s => s.status === 'ACTIVE').length,
        totalPositions: stakingInfo.length
      }
    };
  }

  @Get('apy-calculator')
  @ApiOperation({ summary: 'Calculate APY for different lock periods' })
  @ApiResponse({ status: 200, description: 'APY information retrieved' })
  async getAPYInfo() {
    const apyTiers = [
      { lockPeriodDays: 14, apy: 5 },
      { lockPeriodDays: 30, apy: 6 },
      { lockPeriodDays: 90, apy: 8 },
      { lockPeriodDays: 180, apy: 11 },
      { lockPeriodDays: 365, apy: 15 }
    ];

    return {
      apyTiers,
      description: 'Longer lock periods provide higher APY rewards',
      minLockPeriod: 14,
      maxLockPeriod: 365
    };
  }
}
