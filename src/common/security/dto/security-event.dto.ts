import { IsEnum, IsOptional, IsString, IsNumber, IsObject, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SecurityEventType, SecurityEventSeverity, SecurityEventStatus } from '../entities/security-event.entity';

export class CreateSecurityEventDto {
  @ApiProperty({ enum: SecurityEventType })
  @IsEnum(SecurityEventType)
  eventType: SecurityEventType;

  @ApiPropertyOptional({ enum: SecurityEventSeverity, default: SecurityEventSeverity.LOW })
  @IsOptional()
  @IsEnum(SecurityEventSeverity)
  severity?: SecurityEventSeverity;

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
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  threatScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  indicators?: string[];
}

export class UpdateSecurityEventDto {
  @ApiPropertyOptional({ enum: SecurityEventStatus })
  @IsOptional()
  @IsEnum(SecurityEventStatus)
  status?: SecurityEventStatus;

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

export class SecurityEventQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: SecurityEventType })
  @IsOptional()
  @IsEnum(SecurityEventType)
  eventType?: SecurityEventType;

  @ApiPropertyOptional({ enum: SecurityEventSeverity })
  @IsOptional()
  @IsEnum(SecurityEventSeverity)
  severity?: SecurityEventSeverity;

  @ApiPropertyOptional({ enum: SecurityEventStatus })
  @IsOptional()
  @IsEnum(SecurityEventStatus)
  status?: SecurityEventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

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

export class SecurityEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SecurityEventType })
  eventType: SecurityEventType;

  @ApiProperty({ enum: SecurityEventSeverity })
  severity: SecurityEventSeverity;

  @ApiProperty({ enum: SecurityEventStatus })
  status: SecurityEventStatus;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  endpoint?: string;

  @ApiPropertyOptional()
  method?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  threatScore?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
} 