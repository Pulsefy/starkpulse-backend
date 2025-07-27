import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type ContentItem, ContentStatus } from "../entities/content-item.entity"
import { TaskStatus } from "../entities/validation-task.entity"
import type { CreateContentValidationDto } from "../dto/create-content-validation.dto"
import type { ValidationTaskService } from "./validation-task.service"
import type { QualityMetricsService } from "./quality-metrics.service"
import type { ConsensusService } from "./consensus.service"
import type { BlockchainService } from "./blockchain.service"

@Injectable()
export class ContentValidationService {
  private readonly logger = new Logger(ContentValidationService.name)

  constructor(
    private contentRepository: Repository<ContentItem>,
    private validationTaskService: ValidationTaskService,
    private qualityMetricsService: QualityMetricsService,
    private consensusService: ConsensusService,
    private blockchainService: BlockchainService,
  ) {}

  async submitContentForValidation(dto: CreateContentValidationDto): Promise<ContentItem> {
    this.logger.log(`Submitting content for validation: ${dto.title}`)

    // Create content item
    const contentItem = this.contentRepository.create({
      ...dto,
      status: ContentStatus.PENDING,
      contentHash: await this.generateContentHash(dto.content),
    })

    const savedContent = await this.contentRepository.save(contentItem)

    // Create validation task
    await this.validationTaskService.createValidationTask({
      contentItemId: savedContent.id,
      requiredValidators: this.determineRequiredValidators(dto),
      priority: this.determinePriority(dto),
      rewardAmount: this.calculateRewardAmount(dto),
      validationCriteria: this.getValidationCriteria(dto),
    })

    // Update content status
    savedContent.status = ContentStatus.VALIDATING
    await this.contentRepository.save(savedContent)

    return savedContent
  }

  async getContentValidationStatus(contentId: string): Promise<any> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
      relations: ["validationTasks", "qualityMetrics"],
    })

    if (!content) {
      throw new Error("Content not found")
    }

    const validationTasks = await this.validationTaskService.findByContentId(contentId)
    const qualityMetrics = await this.qualityMetricsService.findByContentId(contentId)

    return {
      content,
      validationTasks,
      qualityMetrics,
      status: content.status,
    }
  }

  async processValidationCompletion(taskId: string): Promise<void> {
    this.logger.log(`Processing validation completion for task: ${taskId}`)

    const task = await this.validationTaskService.findOne(taskId)
    const consensus = await this.consensusService.calculateConsensus(taskId)

    if (consensus.status === "reached") {
      // Update content status based on consensus
      const content = await this.contentRepository.findOne({
        where: { id: task.contentItemId },
      })

      if (content) {
        content.status = consensus.decision === "approved" ? ContentStatus.VALIDATED : ContentStatus.REJECTED

        await this.contentRepository.save(content)

        // Generate quality metrics
        await this.qualityMetricsService.generateQualityMetrics(content.id)

        // Record on blockchain
        await this.blockchainService.recordValidationResult({
          contentId: content.id,
          taskId: taskId,
          consensus: consensus,
          timestamp: new Date(),
        })
      }
    }

    // Update task status
    await this.validationTaskService.updateStatus(taskId, TaskStatus.COMPLETED)
  }

  async getValidatedContent(page = 1, limit = 20): Promise<any> {
    const [content, total] = await this.contentRepository.findAndCount({
      where: { status: ContentStatus.VALIDATED },
      relations: ["qualityMetrics"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      content,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  private async generateContentHash(content: string): Promise<string> {
    const crypto = require("crypto")
    return crypto.createHash("sha256").update(content).digest("hex")
  }

  private determineRequiredValidators(dto: CreateContentValidationDto): number {
    // Logic to determine required validators based on content type, importance, etc.
    const baseValidators = 3

    if (dto.type === "article" && dto.content.length > 5000) {
      return baseValidators + 2
    }

    return baseValidators
  }

  private determinePriority(dto: CreateContentValidationDto): any {
    // Logic to determine priority based on content characteristics
    if (dto.tags?.includes("breaking-news")) {
      return "urgent"
    }

    return "medium"
  }

  private calculateRewardAmount(dto: CreateContentValidationDto): number {
    // Logic to calculate reward amount based on content complexity
    const baseReward = 10
    const lengthMultiplier = Math.min(dto.content.length / 1000, 5)

    return baseReward * lengthMultiplier
  }

  private getValidationCriteria(dto: CreateContentValidationDto): Record<string, any> {
    return {
      accuracy: { weight: 0.3, required: true },
      reliability: { weight: 0.25, required: true },
      bias: { weight: 0.2, required: true },
      clarity: { weight: 0.15, required: false },
      completeness: { weight: 0.1, required: false },
    }
  }
}
