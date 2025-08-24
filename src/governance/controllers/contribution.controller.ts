import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContributionService } from '../services/contribution.service';
import { CreateContributionDto, ReviewContributionDto, ContributionFilterDto } from '../dto/contribution.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Contributions')
@Controller('governance/contributions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContributionController {
  constructor(private readonly contributionService: ContributionService) {}

  @Post()
  @ApiOperation({ summary: 'Submit new contribution' })
  @ApiResponse({ status: 201, description: 'Contribution submitted successfully' })
  async createContribution(@Request() req, @Body() dto: CreateContributionDto) {
    return await this.contributionService.createContribution(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contribution by ID' })
  @ApiResponse({ status: 200, description: 'Contribution retrieved successfully' })
  async getContribution(@Param('id') id: string) {
    return await this.contributionService.getContribution(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get contributions with filters' })
  @ApiResponse({ status: 200, description: 'Contributions retrieved successfully' })
  async getContributions(@Query() filter: ContributionFilterDto) {
    return await this.contributionService.getContributions(filter);
  }

  @Get('user/stats')
  @ApiOperation({ summary: 'Get user contribution statistics' })
  @ApiResponse({ status: 200, description: 'Contribution stats retrieved successfully' })
  async getUserStats(@Request() req) {
    return await this.contributionService.getContributionStats(req.user.id);
  }

  @Get('user/history')
  @ApiOperation({ summary: 'Get user contribution history' })
  @ApiResponse({ status: 200, description: 'Contribution history retrieved successfully' })
  async getUserContributions(
    @Request() req,
    @Query() filter: Partial<ContributionFilterDto>
  ) {
    const userFilter = { ...filter, userId: req.user.id };
    return await this.contributionService.getContributions(userFilter);
  }

  @Put(':id/review')
  @ApiOperation({ summary: 'Review contribution (admin only)' })
  @ApiResponse({ status: 200, description: 'Contribution reviewed successfully' })
  async reviewContribution(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReviewContributionDto
  ) {
    return await this.contributionService.reviewContribution(id, req.user.id, dto);
  }

  @Post(':id/process-reward')
  @ApiOperation({ summary: 'Process reward for approved contribution' })
  @ApiResponse({ status: 200, description: 'Reward processed successfully' })
  async processReward(@Param('id') id: string) {
    const success = await this.contributionService.processRewards(id);
    return {
      success,
      message: success ? 'Reward processed successfully' : 'Failed to process reward'
    };
  }

  @Get('types/list')
  @ApiOperation({ summary: 'Get available contribution types' })
  @ApiResponse({ status: 200, description: 'Contribution types retrieved' })
  async getContributionTypes() {
    return {
      types: [
        { value: 'CODE_COMMIT', label: 'Code Commit', baseScore: 100 },
        { value: 'BUG_REPORT', label: 'Bug Report', baseScore: 50 },
        { value: 'FEATURE_REQUEST', label: 'Feature Request', baseScore: 30 },
        { value: 'DOCUMENTATION', label: 'Documentation', baseScore: 40 },
        { value: 'COMMUNITY_HELP', label: 'Community Help', baseScore: 20 },
        { value: 'GOVERNANCE_PARTICIPATION', label: 'Governance Participation', baseScore: 80 },
        { value: 'REFERRAL', label: 'Referral', baseScore: 25 },
        { value: 'CONTENT_CREATION', label: 'Content Creation', baseScore: 60 },
        { value: 'TESTING', label: 'Testing', baseScore: 70 },
        { value: 'TRANSLATION', label: 'Translation', baseScore: 45 }
      ]
    };
  }

  @Get('leaderboard/top')
  @ApiOperation({ summary: 'Get top contributors leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  async getLeaderboard(
    @Query('period') period = 'all',
    @Query('limit') limit = 10
  ) {
    // This would need to be implemented in the contribution service
    // For now, return a placeholder
    return {
      message: 'Leaderboard endpoint - to be implemented',
      period,
      limit
    };
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get contribution analytics dashboard data' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  async getAnalytics() {
    // This would need to be implemented in the contribution service
    // For now, return a placeholder
    return {
      message: 'Analytics dashboard endpoint - to be implemented'
    };
  }
}
