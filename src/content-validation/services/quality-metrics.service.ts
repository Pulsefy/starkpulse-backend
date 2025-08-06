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
    const allResults: any[] = []

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
    // Logic to calcu
