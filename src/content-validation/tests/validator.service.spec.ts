import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ValidatorService } from "../services/validator.service"
import { Validator, ValidatorStatus, ValidatorTier } from "../entities/validator.entity"
import { ReputationService } from "../services/reputation.service"
import { jest } from "@jest/globals"

describe("ValidatorService", () => {
  let service: ValidatorService
  let repository: Repository<Validator>
  let reputationService: ReputationService

  const mockValidator = {
    id: "1",
    walletAddress: "0x123",
    publicKey: "pubkey123",
    name: "Test Validator",
    status: ValidatorStatus.ACTIVE,
    tier: ValidatorTier.BRONZE,
    reputationScore: 75,
    totalValidations: 10,
    successfulValidations: 8,
    accuracyRate: 80,
  }

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  }

  const mockReputationService = {
    recordReputationChange: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidatorService,
        {
          provide: getRepositoryToken(Validator),
          useValue: mockRepository,
        },
        {
          provide: ReputationService,
          useValue: mockReputationService,
        },
      ],
    }).compile()

    service = module.get<ValidatorService>(ValidatorService)
    repository = module.get<Repository<Validator>>(getRepositoryToken(Validator))
    reputationService = module.get<ReputationService>(ReputationService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("create", () => {
    it("should create a new validator", async () => {
      const createValidatorDto = {
        walletAddress: "0x123",
        publicKey: "pubkey123",
        name: "Test Validator",
      }

      mockRepository.findOne.mockResolvedValue(null)
      mockRepository.create.mockReturnValue(mockValidator)
      mockRepository.save.mockResolvedValue(mockValidator)

      const result = await service.create(createValidatorDto)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { walletAddress: createValidatorDto.walletAddress },
      })
      expect(mockRepository.create).toHaveBeenCalledWith(createValidatorDto)
      expect(mockRepository.save).toHaveBeenCalledWith(mockValidator)
      expect(result).toEqual(mockValidator)
    })

    it("should throw error if validator already exists", async () => {
      const createValidatorDto = {
        walletAddress: "0x123",
        publicKey: "pubkey123",
        name: "Test Validator",
      }

      mockRepository.findOne.mockResolvedValue(mockValidator)

      await expect(service.create(createValidatorDto)).rejects.toThrow(
        "Validator with this wallet address already exists",
      )
    })
  })

  describe("findAll", () => {
    it("should return all validators", async () => {
      const validators = [mockValidator]
      mockRepository.find.mockResolvedValue(validators)

      const result = await service.findAll()

      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ["reputationHistory", "rewards"],
        order: { reputationScore: "DESC" },
      })
      expect(result).toEqual(validators)
    })
  })

  describe("updateReputationScore", () => {
    it("should update validator reputation score", async () => {
      const newScore = 85
      mockRepository.findOne.mockResolvedValue(mockValidator)
      mockRepository.save.mockResolvedValue({ ...mockValidator, reputationScore: newScore })

      const result = await service.updateReputationScore("1", newScore)

      expect(mockRepository.save).toHaveBeenCalled()
      expect(mockReputationService.recordReputationChange).toHaveBeenCalledWith(
        "1",
        75,
        85,
        "reputation_update",
        "Reputation score updated",
      )
      expect(result.reputationScore).toBe(newScore)
    })
  })

  describe("incrementValidationCount", () => {
    it("should increment validation count and update accuracy", async () => {
      mockRepository.findOne.mockResolvedValue(mockValidator)
      const updatedValidator = {
        ...mockValidator,
        totalValidations: 11,
        successfulValidations: 9,
        accuracyRate: 81.82,
      }
      mockRepository.save.mockResolvedValue(updatedValidator)

      const result = await service.incrementValidationCount("1", true)

      expect(result.totalValidations).toBe(11)
      expect(result.successfulValidations).toBe(9)
      expect(result.accuracyRate).toBeCloseTo(81.82, 2)
    })
  })
})
