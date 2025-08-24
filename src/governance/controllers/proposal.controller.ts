import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProposalService } from '../services/proposal.service';
import { CreateProposalDto, UpdateProposalDto, ProposalFilterDto } from '../dto/proposal.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Proposals')
@Controller('governance/proposals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post()
  @ApiOperation({ summary: 'Create new proposal' })
  @ApiResponse({ status: 201, description: 'Proposal created successfully' })
  async createProposal(@Request() req, @Body() dto: CreateProposalDto) {
    return await this.proposalService.createProposal(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get proposal by ID' })
  @ApiResponse({ status: 200, description: 'Proposal retrieved successfully' })
  async getProposal(@Param('id') id: string) {
    return await this.proposalService.getProposal(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get proposals with filters' })
  @ApiResponse({ status: 200, description: 'Proposals retrieved successfully' })
  async getProposals(@Query() filter: ProposalFilterDto) {
    return await this.proposalService.getProposals(filter);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update proposal' })
  @ApiResponse({ status: 200, description: 'Proposal updated successfully' })
  async updateProposal(@Param('id') id: string, @Body() dto: UpdateProposalDto) {
    return await this.proposalService.updateProposal(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate proposal for voting' })
  @ApiResponse({ status: 200, description: 'Proposal activated successfully' })
  async activateProposal(@Param('id') id: string) {
    return await this.proposalService.activateProposal(id);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize proposal voting' })
  @ApiResponse({ status: 200, description: 'Proposal finalized successfully' })
  async finalizeProposal(@Param('id') id: string) {
    return await this.proposalService.finalizeProposal(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute proposal after passing' })
  @ApiResponse({ status: 200, description: 'Proposal executed successfully' })
  async executeProposal(@Param('id') id: string) {
    return await this.proposalService.executeProposal(id);
  }
}
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