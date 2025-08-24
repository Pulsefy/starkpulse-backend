import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { TransferTokenDto } from '../dto/transfer-token.dto';
import { RewardContributionDto } from '../dto/reward-contribution.dto';

@Controller('governance/tokens')
@UseGuards(JwtAuthGuard)
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('balance')
  getUserTokenBalance(@GetUser('id') userId: string) {
    return this.tokenService.getUserTokenBalance(userId);
  }

  @Post('transfer')
  transferTokens(
    @Body() transferTokenDto: TransferTokenDto,
    @GetUser('id') userId: string,
  ) {
    const { toUserId, amount } = transferTokenDto;
    return this.tokenService.transferTokens(userId, toUserId, amount);
  }

  @Post('reward')
  rewardUserContribution(@Body() rewardContributionDto: RewardContributionDto) {
    const { userId, contributionScore } = rewardContributionDto;
    return this.tokenService.rewardUserContribution(userId, contributionScore);
  }
}