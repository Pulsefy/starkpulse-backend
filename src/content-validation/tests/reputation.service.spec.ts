import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ReputationService } from "../services/reputation.service"
import { ReputationScore, ReputationChangeType } from "../entities/reputation-score.entity"
import { jest } from "@jest/globals"

describe("ReputationService", () => {
  let service: ReputationService
  let repository: Repository<ReputationScore>

  const mockReputationScore = {
    id: "1",
    validatorId: "validator1",
    previousScore: 75,
    newScore: 80,
    change: 5,
    changeType: ReputationChangeType.VALIDATION_SUCCESS,
    reason: "Successful validation",
  }

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        {
          provide: getRepositoryToken(ReputationScore),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<ReputationService>(ReputationService)
    repository = module.get<Repository<ReputationScore>>(getRepositoryToken(ReputationScore))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("recordReputationChange", () => {
    it("should record reputation change", async () => {
      mockRepository.create.mockReturnValue(mockReputationScore)
      mockRepository.save.mockResolvedValue(mockReputationScore)

      const result = await service.recordReputationChange(
        "validator1",
        75,
        80,
        ReputationChangeType.VALIDATION_SUCCESS,
        "Successful validation",
      )

      expect(mockRepository.create).toHaveBeenCalledWith({
        validatorId: "validator1",
        previousScore: 75,
        newScore: 80,
        change: 5,
        changeType: ReputationChangeType.VALIDATION_SUCCESS,
        reason: "Successful validation",
        metadata: undefined,
      })
      expect(result).toEqual(mockReputationScore)
    })
  })

  describe("calculateReputationUpdate", () => {
    it("should calculate positive reputation change for high accuracy", async () => {
      const result = await service.calculateReputationUpdate(
        "validator1",
        0.95, // High accuracy
        true, // Consensus agreement
        25, // Quick completion
      )

      expect(result).toBeGreaterThan(0)
      expect(result).toBeCloseTo(2.7, 1) // 2 (accuracy) + 0.5 (consensus) + 0.2 (time)
    })

    it("should calculate negative reputation change for low accuracy", async () => {
      const result = await service.calculateReputationUpdate(
        "validator1",
        0.6, // Low accuracy
        false, // No consensus agreement
        150, // Slow completion
      )

      expect(result).toBeLessThan(0)
      expect(result).toBeCloseTo(-1.4, 1) // -1 (accuracy) - 0.3 (consensus) - 0.1 (time)
    })
  })

  describe("getReputationHistory", () => {
    it("should return reputation history for validator", async () => {
      const history = [mockReputationScore]
      mockRepository.find.mockResolvedValue(history)

      const result = await service.getReputationHistory("validator1")

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { validatorId: "validator1" },
        order: { createdAt: "DESC" },
      })
      expect(result).toEqual(history)
    })
  })
})
