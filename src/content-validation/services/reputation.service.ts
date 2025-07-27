import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { ReputationScore, ReputationChangeType } from "../entities/reputation-score.entity"

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name)

  constructor(private reputationRepository: Repository<ReputationScore>) {}

  async recordReputationChange(
    validatorId: string,
    previousScore: number,
    newScore: number,
    changeType: ReputationChangeType,
    reason?: string,
    metadata?: Record<string, any>,
  ): Promise<ReputationScore> {
    const reputationChange = this.reputationRepository.create({
      validatorId,
      previousScore,
      newScore,
      change: newScore - previousScore,
      changeType,
      reason,
      metadata,
    })

    return await this.reputationRepository.save(reputationChange)
  }

  async calculateReputationUpdate(
    validatorId: string,
    validationAccuracy: number,
    consensusAgreement: boolean,
    timeSpent: number,
  ): Promise<number> {
    this.logger.log(`Calculating reputation update for validator: ${validatorId}`)

    let reputationChange = 0

    // Base reputation change based on validation accuracy
    if (validationAccuracy >= 0.9) {
      reputationChange += 2
    } else if (validationAccuracy >= 0.8) {
      reputationChange += 1
    } else if (validationAccuracy >= 0.7) {
      reputationChange += 0.5
    } else {
      reputationChange -= 1
    }

    // Bonus for consensus agreement
    if (consensusAgreement) {
      reputationChange += 0.5
    } else {
      reputationChange -= 0.3
    }

    // Time efficiency bonus/penalty
    if (timeSpent <= 30) {
      // 30 minutes or less
      reputationChange += 0.2
    } else if (timeSpent > 120) {
      // More than 2 hours
      reputationChange -= 0.1
    }

    return reputationChange
  }

  async updateValidatorReputation(
    validatorId: string,
    reputationChange: number,
    changeType: ReputationChangeType,
    reason?: string,
  ): Promise<void> {
    // This would typically be handled by ValidatorService
    // but we need to avoid circular dependency
    this.logger.log(`Reputation update: ${validatorId}, change: ${reputationChange}`)
  }

  async getReputationHistory(validatorId: string): Promise<ReputationScore[]> {
    return await this.reputationRepository.find({
      where: { validatorId },
      order: { createdAt: "DESC" },
    })
  }

  async getReputationTrend(validatorId: string, days = 30): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const history = await this.reputationRepository.find({
      where: { validatorId },
      order: { createdAt: "ASC" },
    })

    const trend = history.filter((record) => record.createdAt >= startDate)

    return {
      totalChanges: trend.length,
      totalIncrease: trend.filter((r) => r.change > 0).reduce((sum, r) => sum + r.change, 0),
      totalDecrease: trend.filter((r) => r.change < 0).reduce((sum, r) => sum + Math.abs(r.change), 0),
      averageChange: trend.length > 0 ? trend.reduce((sum, r) => sum + r.change, 0) / trend.length : 0,
      trend: trend.map((r) => ({
        date: r.createdAt,
        score: r.newScore,
        change: r.change,
        type: r.changeType,
      })),
    }
  }

  async getTopReputationGainers(limit = 10, days = 7): Promise<any[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const query = `
      SELECT 
        validator_id,
        SUM(change) as total_change,
        COUNT(*) as change_count,
        AVG(change) as avg_change
      FROM reputation_scores 
      WHERE created_at >= $1 AND change > 0
      GROUP BY validator_id
      ORDER BY total_change DESC
      LIMIT $2
    `

    // This would need to be implemented with proper query builder
    // For now, returning empty array
    return []
  }
}
