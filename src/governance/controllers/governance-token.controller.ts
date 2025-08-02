import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GovernanceTokenService } from '../services/governance-token.service';
import { CreateGovernanceTokenDto, UpdateGovernanceTokenDto } from '../dto/governance-token.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Governance Tokens')
@Controller('governance/tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GovernanceTokenController {
  constructor(private readonly tokenService: GovernanceTokenService) {}

  @Post()
  @ApiOperation({ summary: 'Create governance token for user' })
  @ApiResponse({ status: 201, description: 'Token created successfully' })
  async createToken(@Body() dto: CreateGovernanceTokenDto) {
    return await this.tokenService.createToken(dto);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get user token balance' })
  @ApiResponse({ status: 200, description: 'Token balance retrieved' })
  async getBalance(
    @Request() req,
    @Query('tokenType') tokenType?: string
  ) {
    return {
      balance: await this.tokenService.getTokenBalance(req.user.id, tokenType),
      tokenType: tokenType || 'GOVERNANCE'
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user token profile' })
  @ApiResponse({ status: 200, description: 'Token profile retrieved' })
  async getTokenProfile(@Request() req) {
    const governanceToken = await this.tokenService.getTokenByUserId(req.user.id, 'GOVERNANCE');
    const rewardToken = await this.tokenService.getTokenByUserId(req.user.id, 'REWARD');
    const utilityToken = await this.tokenService.getTokenByUserId(req.user.id, 'UTILITY');

    return {
      governance: governanceToken || { balance: 0, votingPower: 0, delegatedPower: 0 },
      reward: rewardToken || { balance: 0 },
      utility: utilityToken || { balance: 0 },
      totalVotingPower: (governanceToken?.votingPower || 0) + (governanceToken?.delegatedPower || 0)
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update governance token' })
  @ApiResponse({ status: 200, description: 'Token updated successfully' })
  async updateToken(
    @Param('id') id: string,
    @Body() dto: UpdateGovernanceTokenDto
  ) {
    return await this.tokenService.updateToken(id, dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer tokens between users' })
  @ApiResponse({ status: 200, description: 'Transfer completed' })
  async transferTokens(
    @Request() req,
    @Body() body: { toUserId: string; amount: number; tokenType?: string }
  ) {
    const success = await this.tokenService.transferTokens(
      req.user.id,
      body.toUserId,
      body.amount,
      body.tokenType
    );

    return {
      success,
      message: success ? 'Transfer completed successfully' : 'Transfer failed'
    };
  }

  @Post('delegate')
  @ApiOperation({ summary: 'Delegate voting power to another user' })
  @ApiResponse({ status: 200, description: 'Delegation completed' })
  async delegateVotingPower(
    @Request() req,
    @Body() body: { delegateId: string; amount: number }
  ) {
    const success = await this.tokenService.delegateVotingPower(
      req.user.id,
      body.delegateId,
      body.amount
    );

    return {
      success,
      message: success ? 'Voting power delegated successfully' : 'Delegation failed'
    };
  }

  @Post('undelegate')
  @ApiOperation({ summary: 'Undelegate voting power' })
  @ApiResponse({ status: 200, description: 'Undelegation completed' })
  async undelegateVotingPower(
    @Request() req,
    @Body() body: { amount: number }
  ) {
    const success = await this.tokenService.undelegateVotingPower(
      req.user.id,
      body.amount
    );

    return {
      success,
      message: success ? 'Voting power undelegated successfully' : 'Undelegation failed'
    };
  }
}
