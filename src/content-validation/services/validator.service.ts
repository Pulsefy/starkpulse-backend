import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type Validator, ValidatorStatus, type ValidatorTier } from "../entities/validator.entity"
import type { CreateValidatorDto } from "../dto/create-validator.dto"
import type { UpdateValidatorDto } from "../dto/update-validator.dto"
import type { ReputationService } from "./reputation.service"
import { ReputationChangeType } from "../entities/reputation-score.entity"

@Injectable()
export class ValidatorService {
  private validatorRepository: Repository<Validator>
  private reputationService: ReputationService

  constructor(validatorRepository: Repository<Validator>, reputationService: ReputationService) {
    this.validatorRepository = validatorRepository
    this.reputationService = reputationService
  }

  async create(createValidatorDto: CreateValidatorDto): Promise<Validator> {
    const existingValidator = await this.validatorRepository.findOne({
      where: { walletAddress: createValidatorDto.walletAddress },
    })

    if (existingValidator) {
      throw new BadRequestException("Validator with this wallet address already exists")
    }

    const validator = this.validatorRepository.create(createValidatorDto)
    return await this.validatorRepository.save(validator)
  }

  async findAll(): Promise<Validator[]> {
    return await this.validatorRepository.find({
      relations: ["reputationHistory", "rewards"],
      order: { reputationScore: "DESC" },
    })
  }

  async findOne(id: string): Promise<Validator> {
    const validator = await this.validatorRepository.findOne({
      where: { id },
      relations: ["validationResults", "reputationHistory", "rewards"],
    })

    if (!validator) {
      throw new NotFoundException("Validator not found")
    }

    return validator
  }

  async findByWalletAddress(walletAddress: string): Promise<Validator> {
    const validator = await this.validatorRepository.findOne({
      where: { walletAddress },
    })

    if (!validator) {
      throw new NotFoundException("Validator not found")
    }

    return validator
  }

  async update(id: string, updateValidatorDto: UpdateValidatorDto): Promise<Validator> {
    const validator = await this.findOne(id)
    Object.assign(validator, updateValidatorDto)
    return await this.validatorRepository.save(validator)
  }

  async updateStatus(id: string, status: ValidatorStatus): Promise<Validator> {
    const validator = await this.findOne(id)
    validator.status = status
    return await this.validatorRepository.save(validator)
  }

  async updateTier(id: string, tier: ValidatorTier): Promise<Validator> {
    const validator = await this.findOne(id)
    validator.tier = tier
    return await this.validatorRepository.save(validator)
  }

  async updateReputationScore(id: string, newScore: number): Promise<Validator> {
    const validator = await this.findOne(id)
    const previousScore = validator.reputationScore
    validator.reputationScore = newScore

    // Update accuracy rate
    if (validator.totalValidations > 0) {
      validator.accuracyRate = (validator.successfulValidations / validator.totalValidations) * 100
    }

    const updatedValidator = await this.validatorRepository.save(validator)

    // Record reputation change
    await this.reputationService.recordReputationChange(
      id,
      previousScore,
      newScore,
      ReputationChangeType.REPUTATION_UPDATE,
      "Reputation score updated",
    )

    return updatedValidator
  }

  async incrementValidationCount(id: string, successful = true): Promise<Validator> {
    const validator = await this.findOne(id)
    validator.totalValidations += 1

    if (successful) {
      validator.successfulValidations += 1
    }

    validator.accuracyRate = (validator.successfulValidations / validator.totalValidations) * 100
    validator.lastActiveAt = new Date()

    return await this.validatorRepository.save(validator)
  }

  async getActiveValidators(): Promise<Validator[]> {
    return await this.validatorRepository.find({
      where: { status: ValidatorStatus.ACTIVE },
      order: { reputationScore: "DESC" },
    })
  }

  async getValidatorsByTier(tier: ValidatorTier): Promise<Validator[]> {
    return await this.validatorRepository.find({
      where: { tier, status: ValidatorStatus.ACTIVE },
      order: { reputationScore: "DESC" },
    })
  }

  async getTopValidators(limit = 10): Promise<Validator[]> {
    return await this.validatorRepository.find({
      where: { status: ValidatorStatus.ACTIVE },
      order: { reputationScore: "DESC" },
      take: limit,
    })
  }

  async remove(id: string): Promise<void> {
    const validator = await this.findOne(id)
    await this.validatorRepository.remove(validator)
  }
}
