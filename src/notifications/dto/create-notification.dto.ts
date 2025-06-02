import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsUrl,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notificationType.enum';
import { NotificationPriority } from '../enums/notificationPriority.enum';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'The title of the notification',
    example: 'Transaction Confirmed',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'The content of the notification',
    example: 'Your transaction has been confirmed on the blockchain.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'The user ID who will receive the notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'The type of notification',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'The priority of the notification',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'The channel to send the notification through',
    enum: ['in_app', 'email', 'push', 'sms'],
    default: 'in_app',
  })
  @IsString()
  @IsOptional()
  channel?: 'in_app' | 'email' | 'push' | 'sms';

  @ApiPropertyOptional({
    description: 'Which template to use (filename without extension)',
    example: 'transaction_confirmed',
  })
  
  @ApiPropertyOptional({
    description: 'Additional metadata for the notification',
    example: { transactionId: '0x123...', amount: '0.5 ETH' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'URL to navigate to when the notification is clicked',
    example: '/transactions/0x123...',
  })
  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'URL to an image to display with the notification',
    example: 'https://example.com/images/transaction.png',
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'When the notification should expire',
    example: '2023-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
