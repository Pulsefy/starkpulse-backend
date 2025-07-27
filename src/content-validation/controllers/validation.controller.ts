import { Controller, Get, Post, Param, Query } from "@nestjs/common"
import type { ContentValidationService } from "../services/content-validation.service"
import type { ValidationResultService } from "../services/validation-result.service"
import type { CreateContentValidationDto } from "../dto/create-content-validation.dto"
import type { CreateValidationResultDto } from "../dto/create-validation-result.dto"

@Controller("validation")
export class ValidationController {
  constructor(
    private readonly contentValidationService: ContentValidationService,
    private readonly validationResultService: ValidationResultService,
  ) {}

  @Post("content")
  submitContent(createContentValidationDto: CreateContentValidationDto) {
    return this.contentValidationService.submitContentForValidation(createContentValidationDto)
  }

  @Get('content/:id/status')
  getContentStatus(@Param('id') id: string) {
    return this.contentValidationService.getContentValidationStatus(id);
  }

  @Get("content/validated")
  getValidatedContent(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.contentValidationService.getValidatedContent(page, limit)
  }

  @Post("result")
  submitValidationResult(createValidationResultDto: CreateValidationResultDto) {
    return this.validationResultService.create(createValidationResultDto)
  }

  @Get('results/task/:taskId')
  getValidationResults(@Param('taskId') taskId: string) {
    return this.validationResultService.findByTaskId(taskId);
  }

  @Get('results/validator/:validatorId')
  getValidatorResults(@Param('validatorId') validatorId: string) {
    return this.validationResultService.findByValidatorId(validatorId);
  }
}
