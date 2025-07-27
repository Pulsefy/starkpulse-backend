import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsArray } from "class-validator"
import { ValidatorTier } from "../entities/validator.entity"

export class CreateValidatorDto {
  @IsString()
  walletAddress: string

  @IsString()
  publicKey: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsEnum(ValidatorTier)
  tier?: ValidatorTier

  @IsOptional()
  @IsNumber()
  stakeAmount?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[]

  @IsOptional()
  metadata?: Record<string, any>
}
