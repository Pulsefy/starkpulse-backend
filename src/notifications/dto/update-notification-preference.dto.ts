import { IsBoolean, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferenceDto {
  @ApiPropertyOptional({
    description: 'Enable in-app notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  inApp?: boolean;

  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Enable push notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @ApiPropertyOptional({
    description: 'Enable SMS notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  sms?: boolean;

  @ApiPropertyOptional({
    description: 'Enable transaction error notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  transactionStatusChanges?: boolean;

  @ApiPropertyOptional({
    description: 'Enable transaction confirmation notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  transactionErrors?: boolean;

  @ApiPropertyOptional({
    description: 'Enable security alert notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  transactionConfirmations?: boolean;

  @ApiPropertyOptional({
    description: 'Enable price alert notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  securityAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Enable portfolio update notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  priceAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Enable news update notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  portfolioUpdates?: boolean;

  @ApiPropertyOptional({
    description: 'Enable system announcement notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  newsUpdates?: boolean;

  @ApiPropertyOptional({
    description: 'Enable system announcement notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  systemAnnouncements?: boolean;

  @ApiPropertyOptional({
    description: 'Email notification frequency',
    enum: ['immediate', 'daily', 'weekly', 'never'],
    example: 'daily',
  })
  @IsEnum(['immediate', 'daily', 'weekly', 'never'])
  @IsOptional()
  emailFrequency?: 'immediate' | 'daily' | 'weekly' | 'never';

  @ApiPropertyOptional({
    description: 'Push notification frequency',
    enum: ['immediate', 'daily', 'weekly', 'never'],
    example: 'immediate',
  })
  @IsEnum(['immediate', 'daily', 'weekly', 'never'])
  @IsOptional()
  pushFrequency?: 'immediate' | 'daily' | 'weekly' | 'never';

  @ApiPropertyOptional({
    description: 'Enable quiet hours',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enableQuietHours?: boolean;

  @ApiPropertyOptional({
    description: 'Quiet hours start time (24-hour format)',
    example: '22:00',
  })
  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (24-hour format)',
    example: '08:00',
  })
  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'Allow urgent notifications during quiet hours',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  quietHoursExceptUrgent?: boolean;
}
