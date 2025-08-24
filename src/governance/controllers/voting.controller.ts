import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { VotingService } from '../services/voting.service';
import { CreateVoteDto } from '../dto/create-vote.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('governance/voting')
@UseGuards(JwtAuthGuard)
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  @Post('vote')
  castVote(@Body() createVoteDto: CreateVoteDto, @GetUser('id') userId: string) {
    return this.votingService.castVote(createVoteDto, userId);
  }

  @Get('user/votes')
  getUserVotes(@GetUser('id') userId: string) {
    return this.votingService.getUserVotes(userId);
  }

  @Get('user/voting-power')
  getUserVotingPower(@GetUser('id') userId: string) {
    return this.votingService.getUserVotingPower(userId);
  }

  @Get('proposal/:proposalId/votes')
  getProposalVotes(@Param('proposalId') proposalId: string) {
    return this.votingService.getProposalVotes(proposalId);
  }
}