import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { StakingService } from '../services/staking.service';
import { StakeTokenDto } from '../dto/stake-token.dto';
import { UnstakeTokenDto } from '../dto/unstake-token.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('governance/staking')
@UseGuards(JwtAuthGuard)
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post('stake')
  stakeTokens(@Body() stakeTokenDto: StakeTokenDto, @GetUser('id') userId: string) {
    return this.stakingService.stakeTokens(stakeTokenDto, userId);
  }

  @Post('unstake')
  unstakeTokens(@Body() unstakeTokenDto: UnstakeTokenDto, @GetUser('id') userId: string) {
    return this.stakingService.unstakeTokens(unstakeTokenDto, userId);
  }

  @Get('user-stakes')
  getUserStakes(@GetUser('id') userId: string) {
    return this.stakingService.getUserStakes(userId);
  }

  @Get('total-staked')
  getTotalStakedAmount() {
    return this.stakingService.getTotalStakedAmount();
  }
}