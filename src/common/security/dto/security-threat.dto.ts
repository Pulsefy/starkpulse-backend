import { IsEnum, IsOptional, IsString, IsNumber, IsObject, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThreatType, ThreatStatus, ThreatSeverity } from '../entities/security-threat.entity';

export class CreateSecurityThreatDto {
  @ApiProperty({ enum: ThreatType })
  @IsEnum(ThreatType)
  threatType: ThreatType;

  @ApiPropertyOptional({ enum: ThreatSeverity, default: ThreatSeverity.MEDIUM })
  @IsOptional()
  @IsEnum(ThreatSeverity)
  severity?: ThreatSeverity;

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
  sourceIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

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
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  evidence?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  impact?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  threatScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedEvents?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedAnomalies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalThreatId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  externalData?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iocHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateSecurityThreatDto {
  @ApiPropertyOptional({ enum: ThreatStatus })
  @IsOptional()
  @IsEnum(ThreatStatus)
  status?: ThreatStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  mitigation?: Record<string, any>;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  mitigatedAt?: string;
}

export class SecurityThreatQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: ThreatType })
  @IsOptional()
  @IsEnum(ThreatType)
  threatType?: ThreatType;

  @ApiPropertyOptional({ enum: ThreatStatus })
  @IsOptional()
  @IsEnum(ThreatStatus)
  status?: ThreatStatus;

  @ApiPropertyOptional({ enum: ThreatSeverity })
  @IsOptional()
  @IsEnum(ThreatSeverity)
  severity?: ThreatSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minThreatScore?: number;

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

export class SecurityThreatResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ThreatType })
  threatType: ThreatType;

  @ApiProperty({ enum: ThreatStatus })
  status: ThreatStatus;

  @ApiProperty({ enum: ThreatSeverity })
  severity: ThreatSeverity;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  sourceIp?: string;

  @ApiPropertyOptional()
  targetIp?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  threatScore?: number;

  @ApiPropertyOptional()
  confidence?: number;

  @ApiPropertyOptional()
  externalThreatId?: string;

  @ApiPropertyOptional()
  iocHash?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  resolvedAt?: Date;

  @ApiPropertyOptional()
  mitigatedAt?: Date;
} 