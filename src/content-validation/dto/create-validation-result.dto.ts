import { IsString, IsEnum, IsNumber, IsOptional, IsInt, Min, Max } from "class-validator"
import { ValidationDecision } from "../entities/validation-result.entity"

export class CreateValidationResultDto {
  @IsString()
  validationTaskId: string

  @IsString()
  validatorId: string

  @IsEnum(ValidationDecision)
  decision: ValidationDecision

  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number

  @IsNumber()
  @Min(0)
  @Max(1)
  accuracyScore: number

  @IsNumber()
  @Min(0)
  @Max(1)
  reliabilityScore: number

  @IsNumber()
  @Min(0)
  @Max(1)
  biasScore: number

  @IsOptional()
  @IsString()
  comments?: string

  @IsOptional()
  evidence?: Record<string, any>

  @IsOptional()
  @IsString({ each: true })
  flags?: string[]

  @IsInt()
  @Min(1)
  timeSpentMinutes: number
}
