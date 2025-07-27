import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ContentValidationService } from "../services/content-validation.service"
import { ContentItem, ContentStatus, ContentType } from "../entities/content-item.entity"
import { ValidationTaskService } from "../services/validation-task.service"
import { QualityMetricsService } from "../services/quality-metrics.service"
import { ConsensusService } from "../services/consensus.service"
import { BlockchainService } from "../services/blockchain.service"
import { jest } from "@jest/globals" // Import jest to fix the undeclared variable error

describe("ContentValidationService", () => {
  let service: ContentValidationService
  let repository: Repository<ContentItem>

  const mockContentItem = {
    id: "1",
    title: "Test Article",
    content: "Test content",
    sourceUrl: "https://example.com",
    author: "Test Author",
    publisher: "Test Publisher",
    type: ContentType.ARTICLE,
    status: ContentStatus.PENDING,
    publishedAt: new Date(),
  }

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  }

  const mockValidationTaskService = {
    createValidationTask: jest.fn(),
    findByContentId: jest.fn(),
    updateStatus: jest.fn(),
  }

  const mockQualityMetricsService = {
    findByContentId: jest.fn(),
    generateQualityMetrics: jest.fn(),
  }

  const mockConsensusService = {
    calculateConsensus: jest.fn(),
  }

  const mockBlockchainService = {
    recordValidationResult: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentValidationService,
        {
          provide: getRepositoryToken(ContentItem),
          useValue: mockRepository,
        },
        {
          provide: ValidationTaskService,
          useValue: mockValidationTaskService,
        },
        {
          provide: QualityMetricsService,
          useValue: mockQualityMetricsService,
        },
        {
          provide: ConsensusService,
          useValue: mockConsensusService,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile()

    service = module.get<ContentValidationService>(ContentValidationService)
    repository = module.get<Repository<ContentItem>>(getRepositoryToken(ContentItem))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("submitContentForValidation", () => {
    it("should submit content for validation", async () => {
      const createContentDto = {
        title: "Test Article",
        content: "Test content",
        sourceUrl: "https://example.com",
        author: "Test Author",
        publisher: "Test Publisher",
        type: ContentType.ARTICLE,
        publishedAt: new Date(),
      }

      mockRepository.create.mockReturnValue(mockContentItem)
      mockRepository.save.mockResolvedValueOnce(mockContentItem)
      mockRepository.save.mockResolvedValueOnce({
        ...mockContentItem,
        status: ContentStatus.VALIDATING,
      })
      mockValidationTaskService.createValidationTask.mockResolvedValue({})

      const result = await service.submitContentForValidation(createContentDto)

      expect(mockRepository.create).toHaveBeenCalled()
      expect(mockValidationTaskService.createValidationTask).toHaveBeenCalled()
      expect(result.status).toBe(ContentStatus.VALIDATING)
    })
  })

  describe("getValidatedContent", () => {
    it("should return paginated validated content", async () => {
      const validatedContent = [{ ...mockContentItem, status: ContentStatus.VALIDATED }]
      mockRepository.findAndCount.mockResolvedValue([validatedContent, 1])
      mockQualityMetricsService.findByContentId.mockResolvedValue([])

      const result = await service.getValidatedContent(1, 20)

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: ContentStatus.VALIDATED },
        relations: ["qualityMetrics"],
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      })
      expect(result.content).toEqual(validatedContent)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })
  })
})
