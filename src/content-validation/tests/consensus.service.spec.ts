import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { ConsensusService } from "../services/consensus.service"
import { ValidationConsensus, ConsensusStatus, ConsensusDecision } from "../entities/validation-consensus.entity"
import { ValidationDecision } from "../entities/validation-result.entity"
import { ValidationResultService } from "../services/validation-result.service"
import { ValidatorService } from "../services/validator.service"
import jest from "jest" // Import jest to fix the undeclared variable error

describe("ConsensusService", () => {
  let service: ConsensusService
  let repository: Repository<ValidationConsensus>

  const mockValidationResults = [
    {
      id: "1",
      validatorId: "validator1",
      decision: ValidationDecision.APPROVE,
      accuracyScore: 0.9,
      reliabilityScore: 0.85,
      biasScore: 0.1,
    },
    {
      id: "2",
      validatorId: "validator2",
      decision: ValidationDecision.APPROVE,
      accuracyScore: 0.88,
      reliabilityScore: 0.9,
      biasScore: 0.15,
    },
    {
      id: "3",
      validatorId: "validator3",
      decision: ValidationDecision.REJECT,
      accuracyScore: 0.75,
      reliabilityScore: 0.8,
      biasScore: 0.2,
    },
  ]

  const mockValidator = {
    id: "validator1",
    reputationScore: 85,
    tier: "gold",
    accuracyRate: 92,
  }

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  }

  const mockValidationResultService = {
    findByTaskId: jest.fn(),
  }

  const mockValidatorService = {
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsensusService,
        {
          provide: getRepositoryToken(ValidationConsensus),
          useValue: mockRepository,
        },
        {
          provide: ValidationResultService,
          useValue: mockValidationResultService,
        },
        {
          provide: ValidatorService,
          useValue: mockValidatorService,
        },
      ],
    }).compile()

    service = module.get<ConsensusService>(ConsensusService)
    repository = module.get<Repository<ValidationConsensus>>(getRepositoryToken(ValidationConsensus))
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("calculateConsensus", () => {
    it("should calculate consensus with approval decision", async () => {
      const taskId = "task1"
      mockValidationResultService.findByTaskId.mockResolvedValue(mockValidationResults)
      mockValidatorService.findOne.mockResolvedValue(mockValidator)
      mockRepository.findOne.mockResolvedValue(null)
      mockRepository.create.mockReturnValue({})

      const mockConsensus = {
        validationTaskId: taskId,
        status: ConsensusStatus.REACHED,
        decision: ConsensusDecision.APPROVED,
        achievedConsensus: 0.7,
        approvalCount: 2,
        rejectionCount: 1,
      }

      mockRepository.save.mockResolvedValue(mockConsensus)

      const result = await service.calculateConsensus(taskId)

      expect(mockValidationResultService.findByTaskId).toHaveBeenCalledWith(taskId)
      expect(mockValidatorService.findOne).toHaveBeenCalledTimes(3)
      expect(result.status).toBe(ConsensusStatus.REACHED)
      expect(result.decision).toBe(ConsensusDecision.APPROVED)
    })

    it("should throw error when no validation results found", async () => {
      const taskId = "task1"
      mockValidationResultService.findByTaskId.mockResolvedValue([])

      await expect(service.calculateConsensus(taskId)).rejects.toThrow("No validation results found for task")
    })
  })
})
