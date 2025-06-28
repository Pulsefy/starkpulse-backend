import { IsEnum, IsOptional, IsString, IsNumber, IsObject, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnomalyType, AnomalyStatus } from '../entities/security-anomaly.entity';

export class CreateSecurityAnomalyDto {
  @ApiProperty({ enum: AnomalyType })
  @IsEnum(AnomalyType)
  anomalyType: AnomalyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  baselineData?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  anomalyData?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  indicators?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  threatScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riskLevel?: string;
}

export class UpdateSecurityAnomalyDto {
  @ApiPropertyOptional({ enum: AnomalyStatus })
  @IsOptional()
  @IsEnum(AnomalyStatus)
  status?: AnomalyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  investigationNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}

export class SecurityAnomalyQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: AnomalyType })
  @IsOptional()
  @IsEnum(AnomalyType)
  anomalyType?: AnomalyType;

  @ApiPropertyOptional({ enum: AnomalyStatus })
  @IsOptional()
  @IsEnum(AnomalyStatus)
  status?: AnomalyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minConfidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class SecurityAnomalyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AnomalyType })
  anomalyType: AnomalyType;

  @ApiProperty({ enum: AnomalyStatus })
  status: AnomalyStatus;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  deviceFingerprint?: string;

  @ApiProperty()
  confidence: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  threatScore?: number;

  @ApiPropertyOptional()
  riskLevel?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
} 