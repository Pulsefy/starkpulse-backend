import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ProposalService } from '../services/proposal.service';
import { CreateProposalDto } from '../dto/create-proposal.dto';
import { UpdateProposalDto } from '../dto/update-proposal.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('governance/proposals')
@UseGuards(JwtAuthGuard)
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post()
  create(@Body() createProposalDto: CreateProposalDto, @GetUser('id') userId: string) {
    return this.proposalService.create(createProposalDto, userId);
  }

  @Get()
  findAll() {
    return this.proposalService.findAll();
  }

  @Get('active')
  getActiveProposals() {
    return this.proposalService.getActiveProposals();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProposalDto: UpdateProposalDto) {
    return this.proposalService.update(id, updateProposalDto);
  }

  @Post(':id/activate')
  activateProposal(@Param('id') id: string) {
    return this.proposalService.activateProposal(id);
  }

  @Post(':id/cancel')
  cancelProposal(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.proposalService.cancelProposal(id, userId);
  }

  @Post(':id/execute')
  executeProposal(@Param('id') id: string) {
    return this.proposalService.executeProposal(id);
  }

  @Post(':id/finalize')
  finalizeProposalVoting(@Param('id') id: string) {
    return this.proposalService.finalizeProposalVoting(id);
  }
}