import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ValidationConsensus, ConsensusStatus, ConsensusDecision } from "../entities/validation-consensus.entity"
import { type ValidationResult, ValidationDecision } from "../entities/validation-result.entity"
import type { ValidationResultService } from "./validation-result.service"
import type { ValidatorService } from "./validator.service"

@Injectable()
export class ConsensusService {
  private readonly logger = new Logger(ConsensusService.name)

  private consensusRepository: Repository<ValidationConsensus>
  private validationResultService: ValidationResultService
  private validatorService: ValidatorService

  constructor(
    consensusRepository: Repository<ValidationConsensus>,
    validationResultService: ValidationResultService,
    validatorService: ValidatorService,
  ) {
    this.consensusRepository = consensusRepository
    this.validationResultService = validationResultService
    this.validatorService = validatorService
  }

  async calculateConsensus(validationTaskId: string): Promise<ValidationConsensus> {
    this.logger.log(`Calculating consensus for task: ${validationTaskId}`)

    const validationResults = await this.validationResultService.findByTaskId(validationTaskId)

    if (validationResults.length === 0) {
      throw new Error("No validation results found for task")
    }

    // Get validator weights based on reputation scores
    const validatorWeights = await this.getValidatorWeights(validationResults)

    // Calculate weighted votes
    const weightedVotes = await this.calculateWeightedVotes(validationResults, validatorWeights)

    // Determine consensus
    const consensusThreshold = 0.66 // 66% threshold
    const totalWeight = Object.values(validatorWeights).reduce((sum, weight) => sum + weight, 0)

    let consensus = await this.consensusRepository.findOne({
      where: { validationTaskId },
    })

    if (!consensus) {
      consensus = this.consensusRepository.create({
        validationTaskId,
        consensusThreshold,
        totalValidators: validationResults.length,
        validatorWeights,
      })
    }

    // Update consensus data
    consensus.approvalCount = weightedVotes.approve
    consensus.rejectionCount = weightedVotes.reject
    consensus.reviewCount = weightedVotes.needs_review

    // Calculate achieved consensus
    const maxVotes = Math.max(weightedVotes.approve, weightedVotes.reject, weightedVotes.needs_review)
    consensus.achievedConsensus = maxVotes / totalWeight

    // Calculate weighted score
    consensus.weightedScore = this.calculateWeightedScore(validationResults, validatorWeights)

    // Determine consensus status and decision
    if (consensus.achievedConsensus >= consensusThreshold) {
      consensus.status = ConsensusStatus.REACHED

      if (weightedVotes.approve > weightedVotes.reject && weightedVotes.approve > weightedVotes.needs_review) {
        consensus.decision = ConsensusDecision.APPROVED
      } else if (weightedVotes.reject > weightedVotes.approve && weightedVotes.reject > weightedVotes.needs_review) {
        consensus.decision = ConsensusDecision.REJECTED
      } else {
        consensus.decision = ConsensusDecision.NEEDS_MORE_VALIDATION
      }
    } else {
      consensus.status = ConsensusStatus.PENDING
    }

    return await this.consensusRepository.save(consensus)
  }

  private async getValidatorWeights(validationResults: ValidationResult[]): Promise<Record<string, number>> {
    const weights: Record<string, number> = {}

    for (const result of validationResults) {
      const validator = await this.validatorService.findOne(result.validatorId)

      // Base weight from reputation score (0.1 to 1.0)
      let weight = Math.max(0.1, validator.reputationScore / 100)

      // Adjust weight based on validator tier
      switch (validator.tier) {
        case "platinum":
          weight *= 1.5
          break
        case "gold":
          weight *= 1.3
          break
        case "silver":
          weight *= 1.1
          break
        default:
          weight *= 1.0
      }

      // Adjust weight based on accuracy rate
      if (validator.accuracyRate > 90) {
        weight *= 1.2
      } else if (validator.accuracyRate < 70) {
        weight *= 0.8
      }

      weights[result.validatorId] = weight
    }

    return weights
  }

  private async calculateWeightedVotes(
    validationResults: ValidationResult[],
    validatorWeights: Record<string, number>,
  ): Promise<Record<string, number>> {
    const votes = {
      approve: 0,
      reject: 0,
      needs_review: 0,
    }

    for (const result of validationResults) {
      const weight = validatorWeights[result.validatorId] || 1

      switch (result.decision) {
        case ValidationDecision.APPROVE:
          votes.approve += weight
          break
        case ValidationDecision.REJECT:
          votes.reject += weight
          break
        case ValidationDecision.NEEDS_REVIEW:
          votes.needs_review += weight
          break
      }
    }

    return votes
  }

  private calculateWeightedScore(
    validationResults: ValidationResult[],
    validatorWeights: Record<string, number>,
  ): number {
    let totalScore = 0
    let totalWeight = 0

    for (const result of validationResults) {
      const weight = validatorWeights[result.validatorId] || 1
      const score = (result.accuracyScore + result.reliabilityScore + (1 - result.biasScore)) / 3

      totalScore += score * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  async findByTaskId(validationTaskId: string): Promise<ValidationConsensus[]> {
    return await this.consensusRepository.find({
      where: { validationTaskId },
      order: { createdAt: "DESC" },
    })
  }

  async getConsensusHistory(validationTaskId: string): Promise<ValidationConsensus[]> {
    return await this.consensusRepository.find({
      where: { validationTaskId },
      order: { createdAt: "ASC" },
    })
  }
}
