import { Controller, Get, UseGuards } from '@nestjs/common';
import { GovernanceService } from '../services/governance.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('governance')
@UseGuards(JwtAuthGuard)
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get('overview')
  async getGovernanceOverview(@GetUser('id') userId: string) {
    return this.governanceService.getGovernanceOverview(userId);
  }

  @Get('stats')
  async getGovernanceStats() {
    return this.governanceService.getGovernanceStats();
  }
}