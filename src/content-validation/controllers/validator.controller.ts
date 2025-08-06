import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common"
import type { ValidatorService } from "../services/validator.service"
import type { CreateValidatorDto } from "../dto/create-validator.dto"
import type { UpdateValidatorDto } from "../dto/update-validator.dto"
import type { ValidatorStatus, ValidatorTier } from "../entities/validator.entity"

@Controller("validators")
export class ValidatorController {
  constructor(private readonly validatorService: ValidatorService) {}

  @Post()
  create(createValidatorDto: CreateValidatorDto) {
    return this.validatorService.create(createValidatorDto)
  }

  @Get()
  findAll() {
    return this.validatorService.findAll()
  }

  @Get("active")
  getActiveValidators() {
    return this.validatorService.getActiveValidators()
  }

  @Get('top')
  getTopValidators(@Query('limit') limit?: number) {
    return this.validatorService.getTopValidators(limit);
  }

  @Get('tier/:tier')
  getValidatorsByTier(@Param('tier') tier: ValidatorTier) {
    return this.validatorService.getValidatorsByTier(tier);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.validatorService.findOne(id);
  }

  @Patch(":id")
  update(@Param('id') id: string, updateValidatorDto: UpdateValidatorDto) {
    return this.validatorService.update(id, updateValidatorDto)
  }

  @Patch(":id/status")
  updateStatus(@Param('id') id: string, @Body('status') status: ValidatorStatus) {
    return this.validatorService.updateStatus(id, status)
  }

  @Patch(":id/tier")
  updateTier(@Param('id') id: string, @Body('tier') tier: ValidatorTier) {
    return this.validatorService.updateTier(id, tier)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.validatorService.remove(id);
  }
}
