import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ValidatorReward, RewardType, RewardStatus } from "../entities/validator-reward.entity"
import type { ValidationResult } from "../entities/validation-result.entity"
import type { BlockchainService } from "./blockchain.service"

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name)

  constructor(
    private rewardRepository: Repository<ValidatorReward>,
    private blockchainService: BlockchainService,
  ) {}

  async calculateValidationReward(
    validatorId: string,
    validationResult: ValidationResult,
    consensusAgreement: boolean,
    baseReward: number,
  ): Promise<number> {
    let rewardAmount = baseReward

    // Accuracy bonus
    if (validationResult.accuracyScore >= 0.9) {
      rewardAmount *= 1.5
    } else if (validationResult.accuracyScore >= 0.8) {
      rewardAmount *= 1.2
    }

    // Consensus agreement bonus
    if (consensusAgreement) {
      rewardAmount *= 1.1
    }

    // Time efficiency bonus
    if (validationResult.timeSpentMinutes <= 30) {
      rewardAmount *= 1.05
    }

    // Reliability bonus
    if (validationResult.reliabilityScore >= 0.9) {
      rewardAmount *= 1.1
    }

    return Math.round(rewardAmount * 100) / 100 // Round to 2 decimal places
  }

  async distributeValidationReward(validatorId: string, amount: number, reason: string): Promise<ValidatorReward> {
    const reward = this.rewardRepository.create({
      validatorId,
      rewardType: RewardType.VALIDATION_REWARD,
      amount,
      currency: "CVT", // Content Validation Token
      reason,
      status: RewardStatus.PENDING,
    })

    const savedReward = await this.rewardRepository.save(reward)

    // Process reward distribution
    await this.processRewardDistribution(savedReward)

    return savedReward
  }

  async distributeConsensusBonus(validatorId: string, amount: number): Promise<ValidatorReward> {
    const reward = this.rewardRepository.create({
      validatorId,
      rewardType: RewardType.CONSENSUS_BONUS,
      amount,
      currency: "CVT",
      reason: "Consensus agreement bonus",
      status: RewardStatus.PENDING,
    })

    const savedReward = await this.rewardRepository.save(reward)
    await this.processRewardDistribution(savedReward)

    return savedReward
  }

  async distributeAccuracyBonus(validatorId: string, accuracyRate: number): Promise<ValidatorReward | null> {
    if (accuracyRate < 0.95) return null // Only reward very high accuracy

    const bonusAmount = (accuracyRate - 0.9) * 100 // Bonus based on accuracy above 90%

    const reward = this.rewardRepository.create({
      validatorId,
      rewardType: RewardType.ACCURACY_BONUS,
      amount: bonusAmount,
      currency: "CVT",
      reason: `High accuracy bonus: ${(accuracyRate * 100).toFixed(1)}%`,
      status: RewardStatus.PENDING,
    })

    const savedReward = await this.rewardRepository.save(reward)
    await this.processRewardDistribution(savedReward)

    return savedReward
  }

  async distributeStakeReward(validatorId: string, stakeAmount: number, annualRate = 0.05): Promise<ValidatorReward> {
    const dailyRate = annualRate / 365
    const rewardAmount = stakeAmount * dailyRate

    const reward = this.rewardRepository.create({
      validatorId,
      rewardType: RewardType.STAKE_REWARD,
      amount: rewardAmount,
      currency: "CVT",
      reason: "Daily staking reward",
      status: RewardStatus.PENDING,
    })

    const savedReward = await this.rewardRepository.save(reward)
    await this.processRewardDistribution(savedReward)

    return savedReward
  }

  async getValidatorRewards(validatorId: string): Promise<ValidatorReward[]> {
    return await this.rewardRepository.find({
      where: { validatorId },
      order: { createdAt: "DESC" },
    })
  }

  async getTotalRewards(validatorId: string): Promise<{
    total: number
    byType: Record<RewardType, number>
    pending: number
    distributed: number
  }> {
    const rewards = await this.getValidatorRewards(validatorId)

    const total = rewards.reduce((sum, reward) => sum + reward.amount, 0)
    const pending = rewards
      .filter((r) => r.status === RewardStatus.PENDING)
      .reduce((sum, reward) => sum + reward.amount, 0)
    const distributed = rewards
      .filter((r) => r.status === RewardStatus.DISTRIBUTED)
      .reduce((sum, reward) => sum + reward.amount, 0)

    const byType: Record<RewardType, number> = {
      [RewardType.VALIDATION_REWARD]: 0,
      [RewardType.CONSENSUS_BONUS]: 0,
      [RewardType.ACCURACY_BONUS]: 0,
      [RewardType.STAKE_REWARD]: 0,
      [RewardType.REFERRAL_BONUS]: 0,
    }

    rewards.forEach((reward) => {
      byType[reward.rewardType] += reward.amount
    })

    return { total, byType, pending, distributed }
  }

  private async processRewardDistribution(reward: ValidatorReward): Promise<void> {
    try {
      // Simulate blockchain transaction for reward distribution
      const transactionHash = await this.simulateBlockchainTransaction(reward)

      reward.transactionHash = transactionHash
      reward.status = RewardStatus.DISTRIBUTED
      reward.distributedAt = new Date()

      await this.rewardRepository.save(reward)

      // Record on blockchain
      await this.blockchainService.recordRewardDistribution({
        validatorId: reward.validatorId,
        amount: reward.amount,
        currency: reward.currency,
        reason: reward.reason,
      })

      this.logger.log(`Reward distributed: ${reward.amount} ${reward.currency} to ${reward.validatorId}`)
    } catch (error) {
      this.logger.error(`Failed to distribute reward: ${error.message}`)
      reward.status = RewardStatus.FAILED
      await this.rewardRepository.save(reward)
    }
  }

  private async simulateBlockchainTransaction(reward: ValidatorReward): Promise<string> {
    // Simulate blockchain transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const crypto = require("crypto")
    return crypto.randomBytes(32).toString("hex")
  }
}
