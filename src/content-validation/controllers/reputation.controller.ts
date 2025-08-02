import { Controller, Get, Param, Query } from "@nestjs/common"
import type { ReputationService } from "../services/reputation.service"

@Controller("reputation")
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get('validator/:validatorId/history')
  getReputationHistory(@Param('validatorId') validatorId: string) {
    return this.reputationService.getReputationHistory(validatorId);
  }

  @Get("validator/:validatorId/trend")
  getReputationTrend(@Param('validatorId') validatorId: string, @Query('days') days?: number) {
    return this.reputationService.getReputationTrend(validatorId, days)
  }

  @Get("top-gainers")
  getTopReputationGainers(@Query('limit') limit?: number, @Query('days') days?: number) {
    return this.reputationService.getTopReputationGainers(limit, days)
  }
}
