import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VotingService } from '../services/voting.service';
import { CastVoteDto } from '../dto/proposal.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Voting')
@Controller('governance/voting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  // ✅ Cast a vote
  @Post('cast')
  @ApiOperation({ summary: 'Cast vote on proposal' })
  @ApiResponse({ status: 201, description: 'Vote cast successfully' })
  async castVote(@Request() req, @Body() dto: CastVoteDto) {
    return await this.votingService.castVote(req.user.id, dto);
  }

  // ✅ Get all votes for a proposal
  @Get('proposal/:proposalId')
  @ApiOperation({ summary: 'Get all votes for a proposal' })
  @ApiResponse({ status: 200, description: 'Votes retrieved successfully' })
  async getVotesForProposal(@Param('proposalId') proposalId: string) {
    return await this.votingService.getVotesForProposal(proposalId);
  }

  // ✅ Get user's vote on a specific proposal
  @Get('user/:proposalId')
  @ApiOperation({ summary: 'Get user vote for a specific proposal' })
  @ApiResponse({ status: 200, description: 'User vote retrieved' })
  async getUserVote(@Request() req, @Param('proposalId') proposalId: string) {
    return await this.votingService.getVote(proposalId, req.user.id);
  }

  // ✅ Get user voting power
  @Get('power')
  @ApiOperation({ summary: 'Get user voting power' })
  @ApiResponse({ status: 200, description: 'Voting power retrieved' })
  async getVotingPower(@Request() req) {
    const votingPower = await this.votingService.calculateVotingPower(req.user.id);
    return {
      userId: req.user.id,
      votingPower,
      canVote: votingPower > 0,
    };
  }

  // ✅ Get user voting history (to be implemented)
  @Get('history')
  @ApiOperation({ summary: 'Get user voting history' })
  @ApiResponse({ status: 200, description: 'Voting history retrieved' })
  async getVotingHistory(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return {
      message: 'Voting history endpoint - to be implemented',
      userId: req.user.id,
      page,
      limit,
    };
  }

  // ✅ Get voting statistics for a proposal
  @Get('stats/:proposalId')
  @ApiOperation({ summary: 'Get voting statistics for a proposal' })
  @ApiResponse({ status: 200, description: 'Voting stats retrieved' })
  async getVotingStats(@Param('proposalId') proposalId: string) {
    const votes = await this.votingService.getVotesForProposal(proposalId);

    const stats = {
      totalVotes: votes.length,
      votesFor: votes.filter(v => v.voteType === 'FOR').length,
      votesAgainst: votes.filter(v => v.voteType === 'AGAINST').length,
      votesAbstain: votes.filter(v => v.voteType === 'ABSTAIN').length,
      totalVotingPower: votes.reduce((sum, v) => sum + v.votingPower, 0),
      weightedVotesFor: votes
        .filter(v => v.voteType === 'FOR')
        .reduce((sum, v) => sum + v.weightedVote, 0),
      weightedVotesAgainst: votes
        .filter(v => v.voteType === 'AGAINST')
        .reduce((sum, v) => sum + v.weightedVote, 0),
      weightedVotesAbstain: votes
        .filter(v => v.voteType === 'ABSTAIN')
        .reduce((sum, v) => sum + v.weightedVote, 0),
    };

    return stats;
  }
}
