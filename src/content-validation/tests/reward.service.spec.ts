import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { RewardService } from "../services/reward.service"
import { ValidatorReward, RewardType, RewardStatus } from "../entities/validator-reward.entity"
import type { ValidationResult } from "../entities/validation-result.entity"
import { BlockchainService } from "../services/blockchain.service"
import { jest } from "@jest/globals"

describe("RewardService", () => {
  let service: RewardService
  let repository: Repository<ValidatorReward>

  const mockValidationResult = {
    id: "1",
    accuracyScore: 0.9,
    reliabilityScore: 0.85,
    timeSpentMinutes: 25,
  } as ValidationResult

  const mockReward = {
    id: "1",
    validatorId: "validator1",
    rewardType: RewardType.VALIDATION_REWARD,
    amount: 15,
    currency: "CVT",
    status: RewardStatus.PENDING,
  }

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockBlockchainService = {
    recordRewardDistribution: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        {
          provide: getRepositoryToken(ValidatorReward),
          useValue: mockRepository,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile()

    service = module.get<RewardService>(RewardService)
    repository = module.get<Repository<ValidatorReward>>(getRepositoryToken(ValidatorReward))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("calculateValidationReward", () => {
    it("should calculate reward with bonuses for high accuracy and consensus", async () => {
      const baseReward = 10
      const result = await service.calculateValidationReward(
        "validator1",
        mockValidationResult,
        true, // consensus agreement
        baseReward,
      )

      // Expected: 10 * 1.5 (accuracy) * 1.1 (consensus) * 1.05 (time) * 1.1 (reliability) = 19.16
      expect(result).toBeCloseTo(19.16, 2)
    })

    it("should calculate base reward without bonuses", async () => {
      const lowAccuracyResult = {
        ...mockValidationResult,
        accuracyScore: 0.7,
        reliabilityScore: 0.7,
        timeSpentMinutes: 90,
      } as ValidationResult

      const baseReward = 10
      const result = await service.calculateValidationReward(
        "validator1",
        lowAccuracyResult,
        false, // no consensus agreement
        baseReward,
      )

      expect(result).toBe(baseReward) // No bonuses applied
    })
  })

  describe("distributeValidationReward", () => {
    it("should distribute validation reward", async () => {
      mockRepository.create.mockReturnValue(mockReward)
      mockRepository.save.mockResolvedValue({
        ...mockReward,
        status: RewardStatus.DISTRIBUTED,
        transactionHash: "tx123",
      })

      const result = await service.distributeValidationReward("validator1", 15, "Validation completed")

      expect(mockRepository.create).toHaveBeenCalledWith({
        validatorId: "validator1",
        rewardType: RewardType.VALIDATION_REWARD,
        amount: 15,
        currency: "CVT",
        reason: "Validation completed",
        status: RewardStatus.PENDING,
      })
      expect(mockBlockchainService.recordRewardDistribution).toHaveBeenCalled()
    })
  })

  describe("getTotalRewards", () => {
    it("should calculate total rewards by type and status", async () => {
      const rewards = [
        { ...mockReward, amount: 10, status: RewardStatus.DISTRIBUTED },
        { ...mockReward, amount: 5, status: RewardStatus.PENDING, rewardType: RewardType.CONSENSUS_BONUS },
        { ...mockReward, amount: 8, status: RewardStatus.DISTRIBUTED, rewardType: RewardType.ACCURACY_BONUS },
      ]

      mockRepository.find.mockResolvedValue(rewards)

      const result = await service.getTotalRewards("validator1")

      expect(result.total).toBe(23)
      expect(result.pending).toBe(5)
      expect(result.distributed).toBe(18)
      expect(result.byType[RewardType.VALIDATION_REWARD]).toBe(10)
      expect(result.byType[RewardType.CONSENSUS_BONUS]).toBe(5)
      expect(result.byType[RewardType.ACCURACY_BONUS]).toBe(8)
    })
  })
})
