import { Controller, Post, Body, Get, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateDelegationDto } from '../dto/create-delegation.dto';
import { DelegationService } from '../services/delegation.service';

@Controller('governance/delegation')
@UseGuards(JwtAuthGuard)
export class DelegationController {
  constructor(private readonly delegationService: DelegationService) {}

  @Post()
  async createDelegation(
    @Request() req,
    @Body() createDelegationDto: CreateDelegationDto,
  ) {
    return this.delegationService.createDelegation(
      req.user.id,
      createDelegationDto.delegateAddress,
      createDelegationDto.amount,
    );
  }

  @Get()
  async getUserDelegations(@Request() req) {
    return this.delegationService.getUserDelegations(req.user.id);
  }

  @Get('received')
  async getReceivedDelegations(@Request() req) {
    return this.delegationService.getReceivedDelegations(req.user.id);
  }

  @Delete(':id')
  async revokeDelegation(@Request() req, @Param('id') id: string) {
    return this.delegationService.revokeDelegation(id, req.user.id);
  }

  @Get('total-delegated')
  async getTotalDelegatedPower(@Request() req) {
    return this.delegationService.getTotalDelegatedPower(req.user.id);
  }

  @Get('total-received')
  async getTotalReceivedPower(@Request() req) {
    return this.delegationService.getTotalReceivedPower(req.user.id);
  }
}