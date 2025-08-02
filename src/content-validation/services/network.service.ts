import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { ValidatorService } from "./validator.service"
import type { ValidationTaskService } from "./validation-task.service"
import type { RewardService } from "./reward.service"
import type { QualityMetricsService } from "./quality-metrics.service"
import { ValidatorTier } from "../entities/validator.entity"

@Injectable()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name)

  constructor(
    private validatorService: ValidatorService,
    private validationTaskService: ValidationTaskService,
    private rewardService: RewardService,
    private qualityMetricsService: QualityMetricsService,
  ) {}

  async getNetworkStatus(): Promise<any> {
    const activeValidators = await this.validatorService.getActiveValidators()
    const pendingTasks = await this.validationTaskService.getPendingTasks()

    return {
      totalValidators: activeValidators.length,
      activeValidators: activeValidators.filter(
        (v) => v.lastActiveAt && new Date().getTime() - v.lastActiveAt.getTime() < 24 * 60 * 60 * 1000,
      ).length,
      pendingTasks: pendingTasks.length,
      networkHealth: this.calculateNetworkHealth(activeValidators, pendingTasks),
      averageReputationScore: this.calculateAverageReputation(activeValidators),
      validatorDistribution: this.getValidatorDistribution(activeValidators),
    }
  }

  async getNetworkMetrics(): Promise<any> {
    const validators = await this.validatorService.findAll()

    return {
      totalValidations: validators.reduce((sum, v) => sum + v.totalValidations, 0),
      successfulValidations: validators.reduce((sum, v) => sum + v.successfulValidations, 0),
      averageAccuracy:
        validators.length > 0 ? validators.reduce((sum, v) => sum + v.accuracyRate, 0) / validators.length : 0,
      totalStaked: validators.reduce((sum, v) => sum + v.stakeAmount, 0),
      reputationDistribution: this.getReputationDistribution(validators),
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async performNetworkMaintenance(): Promise<void> {
    this.logger.log("Performing network maintenance...")

    // Update validator tiers based on performance
    await this.updateValidatorTiers()

    // Distribute staking rewards
    await this.distributeStakingRewards()

    // Clean up expired tasks
    await this.cleanupExpiredTasks()

    this.logger.log("Network maintenance completed")
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReports(): Promise<void> {
    this.logger.log("Generating daily network reports...")

    const networkStatus = await this.getNetworkStatus()
    const networkMetrics = await this.getNetworkMetrics()

    // Store daily metrics (would typically save to database)
    this.logger.log("Daily report generated", { networkStatus, networkMetrics })
  }

  private calculateNetworkHealth(validators: any[], pendingTasks: any[]): string {
    const activeValidatorRatio =
      validators.filter((v) => v.lastActiveAt && new Date().getTime() - v.lastActiveAt.getTime() < 24 * 60 * 60 * 1000)
        .length / validators.length

    const taskBacklogRatio = pendingTasks.length / Math.max(validators.length, 1)

    if (activeValidatorRatio > 0.8 && taskBacklogRatio < 2) {
      return "healthy"
    } else if (activeValidatorRatio > 0.6 && taskBacklogRatio < 5) {
      return "moderate"
    } else {
      return "poor"
    }
  }

  private calculateAverageReputation(validators: any[]): number {
    if (validators.length === 0) return 0
    return validators.reduce((sum, v) => sum + v.reputationScore, 0) / validators.length
  }

  private getValidatorDistribution(validators: any[]): Record<string, number> {
    const distribution = { bronze: 0, silver: 0, gold: 0, platinum: 0 }
    validators.forEach((v) => {
      distribution[v.tier]++
    })
    return distribution
  }

  private getReputationDistribution(validators: any[]): Record<string, number> {
    const ranges = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    }

    validators.forEach((v) => {
      const score = v.reputationScore
      if (score <= 20) ranges["0-20"]++
      else if (score <= 40) ranges["21-40"]++
      else if (score <= 60) ranges["41-60"]++
      else if (score <= 80) ranges["61-80"]++
      else ranges["81-100"]++
    })

    return ranges
  }

  private async updateValidatorTiers(): Promise<void> {
    const validators = await this.validatorService.findAll()

    for (const validator of validators) {
      let newTier = validator.tier

      if (validator.reputationScore >= 90 && validator.accuracyRate >= 95) {
        newTier = ValidatorTier.Platinum
      } else if (validator.reputationScore >= 75 && validator.accuracyRate >= 90) {
        newTier = ValidatorTier.Gold
      } else if (validator.reputationScore >= 60 && validator.accuracyRate >= 80) {
        newTier = ValidatorTier.Silver
      } else {
        newTier = ValidatorTier.Bronze
      }

      if (newTier !== validator.tier) {
        await this.validatorService.updateTier(validator.id, newTier as any)
        this.logger.log(`Updated validator ${validator.id} tier to ${newTier}`)
      }
    }
  }

  private async distributeStakingRewards(): Promise<void> {
    const validators = await this.validatorService.getActiveValidators()

    for (const validator of validators) {
      if (validator.stakeAmount > 0) {
        await this.rewardService.distributeStakeReward(validator.id, validator.stakeAmount)
      }
    }
  }

  private async cleanupExpiredTasks(): Promise<void> {
    // Implementation would clean up expired validation tasks
    this.logger.log("Cleaning up expired tasks...")
  }
}
