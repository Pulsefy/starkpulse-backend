import { Injectable, NotFoundException } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { ValidationResult } from "../entities/validation-result.entity"
import type { CreateValidationResultDto } from "../dto/create-validation-result.dto"
import type { ValidatorService } from "./validator.service"
import type { ReputationService } from "./reputation.service"

@Injectable()
export class ValidationResultService {
  private resultRepository: Repository<ValidationResult>
  private validatorService: ValidatorService
  private reputationService: ReputationService

  constructor(
    resultRepository: Repository<ValidationResult>,
    validatorService: ValidatorService,
    reputationService: ReputationService,
  ) {
    this.resultRepository = resultRepository
    this.validatorService = validatorService
    this.reputationService = reputationService
  }

  async create(createValidationResultDto: CreateValidationResultDto): Promise<ValidationResult> {
    const result = this.resultRepository.create(createValidationResultDto)
    const savedResult = await this.resultRepository.save(result)

    // Update validator statistics
    await this.validatorService.incrementValidationCount(
      createValidationResultDto.validatorId,
      createValidationResultDto.accuracyScore > 0.7,
    )

    // Calculate reputation change
    const reputationChange = await this.reputationService.calculateReputationUpdate(
      createValidationResultDto.validatorId,
      createValidationResultDto.accuracyScore,
      true, // This would be determined by consensus
      createValidationResultDto.timeSpentMinutes,
    )

    return savedResult
  }

  async findByTaskId(validationTaskId: string): Promise<ValidationResult[]> {
    return await this.resultRepository.find({
      where: { validationTaskId },
      relations: ["validator"],
      order: { createdAt: "DESC" },
    })
  }

  async findByValidatorId(validatorId: string): Promise<ValidationResult[]> {
    return await this.resultRepository.find({
      where: { validatorId },
      relations: ["validationTask", "validationTask.contentItem"],
      order: { createdAt: "DESC" },
    })
  }

  async findOne(id: string): Promise<ValidationResult> {
    const result = await this.resultRepository.findOne({
      where: { id },
      relations: ["validator", "validationTask", "validationTask.contentItem"],
    })

    if (!result) {
      throw new NotFoundException("Validation result not found")
    }

    return result
  }
}
