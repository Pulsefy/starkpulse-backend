import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { QualityMetric } from "../entities/quality-metric.entity"
import type { ValidationResultService } from "./validation-result.service"
import type { ConsensusService } from "./consensus.service"

@Injectable()
export class QualityMetricsService {
  private readonly logger = new Logger(QualityMetricsService.name)

  constructor(
    private qualityMetricRepository: Repository<QualityMetric>,
    private validationResultService: ValidationResultService,
    private consensusService: ConsensusService,
  ) {}

  async generateQualityMetrics(contentItemId: string): Promise<QualityMetric> {
    this.logger.log(`Generating quality metrics for content: ${contentItemId}`)

    // Get all validation results for this content
    const validationTasks = await this.getValidationTasksForContent(contentItemId)
    const allResults = []

    for (const task of validationTasks) {
      const results = await this.validationResultService.findByTaskId(task.id)
      allResults.push(...results)
    }

    if (allResults.length === 0) {
      throw new Error("No validation results found for content")
    }

    // Calculate individual metrics
    const accuracyScore = this.calculateAverageScore(allResults, "accuracyScore")
    const reliabilityScore = this.calculateAverageScore(allResults, "reliabilityScore")
    const biasScore = this.calculateAverageScore(allResults, "biasScore")
    const clarityScore = this.calculateClarityScore(allResults)
    const completenessScore = this.calculateCompletenessScore(allResults)
    const timelinessScore = this.calculateTimelinessScore(contentItemId)
    const sourceCredibilityScore = this.calculateSourceCredibilityScore(contentItemId)

    // Calculate overall score
    const overallScore = this.calculateOverallScore({
      accuracyScore,
      reliabilityScore,
      biasScore,
      clarityScore,
      completenessScore,
      timelinessScore,
      sourceCredibilityScore,
    })

    // Get consensus strength
    const consensusStrength = await this.calculateConsensusStrength(validationTasks)

    const qualityMetric = this.qualityMetricRepository.create({
      contentItemId,
      overallScore,
      accuracyScore,
      reliabilityScore,
      biasScore,
      clarityScore,
      completenessScore,
      timelinessScore,
      sourceCredibilityScore,
      totalValidations: allResults.length,
      consensusStrength,
      detailedMetrics: {
        validationBreakdown: this.getValidationBreakdown(allResults),
        flagsSummary: this.getFlagsSummary(allResults),
      },
    })

    return await this.qualityMetricRepository.save(qualityMetric)
  }

  async findByContentId(contentItemId: string): Promise<QualityMetric[]> {
    return await this.qualityMetricRepository.find({
      where: { contentItemId },
      order: { createdAt: "DESC" },
    })
  }

  private calculateAverageScore(results: any[], field: string): number {
    if (results.length === 0) return 0

    const sum = results.reduce((acc, result) => acc + (result[field] || 0), 0)
    return sum / results.length
  }

  private calculateClarityScore(results: any[]): number {
    // Logic to calculate clarity based on validation comments and flags
    return this.calculateAverageScore(results, "confidenceScore")
  }

  private calculateCompletenessScore(results: any[]): number {
    // Logic to calculate completeness based on validation criteria coverage
    return 0.8 // Placeholder
  }

  private calculateTimelinessScore(contentItemId: string): number {
    // Logic to calculate timeliness based on content publication date vs validation time
    return 0.9 // Placeholder
  }

  private calculateSourceCredibilityScore(contentItemId: string): number {
    // Logic to calculate source credibility based on publisher reputation
    return 0.85 // Placeholder
  }

  private calculateOverallScore(scores: {
    accuracyScore: number
    reliabilityScore: number
    biasScore: number
    clarityScore: number
    completenessScore: number
    timelinessScore: number
    sourceCredibilityScore: number
  }): number {
    const weights = {
      accuracy: 0.25,
      reliability: 0.2,
      bias: 0.15,
      clarity: 0.15,
      completeness: 0.1,
      timeliness: 0.1,
      sourceCredibility: 0.05,
    }

    return (
      scores.accuracyScore * weights.accuracy +
      scores.reliabilityScore * weights.reliability +
      (1 - scores.biasScore) * weights.bias + // Lower bias is better
      scores.clarityScore * weights.clarity +
      scores.completenessScore * weights.completeness +
      scores.timelinessScore * weights.timeliness +
      scores.sourceCredibilityScore * weights.sourceCredibility
    )
  }

  private async calculateConsensusStrength(validationTasks: any[]): Promise<number> {
    let totalConsensusStrength = 0
    let taskCount = 0

    for (const task of validationTasks) {
      const consensus = await this.consensusService.findByTaskId(task.id)
      if (consensus.length > 0) {
        totalConsensusStrength += consensus[0].achievedConsensus || 0
        taskCount++
      }
    }

    return taskCount > 0 ? totalConsensusStrength / taskCount : 0
  }

  private getValidationBreakdown(results: any[]): Record<string, any> {
    const breakdown = {
      approve: 0,
      reject: 0,
      needs_review: 0,
    }

    results.forEach((result) => {
      breakdown[result.decision]++
    })

    return breakdown
  }

  private getFlagsSummary(results: any[]): Record<string, number> {
    const flagsSummary: Record<string, number> = {}

    results.forEach((result) => {
      if (result.flags && Array.isArray(result.flags)) {
        result.flags.forEach((flag: string) => {
          flagsSummary[flag] = (flagsSummary[flag] || 0) + 1
        })
      }
    })

    return flagsSummary
  }

  private async getValidationTasksForContent(contentItemId: string): Promise<any[]> {
    // This would typically use ValidationTaskService
    // For now, returning empty array as placeholder
    return []
  }
}
