import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';
import { TransactionType } from '../enums/transactionType.enum';
import { TransactionStatus } from '../enums/transactionStatus.enum';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @ApiProperty({
    description: 'The transaction status',
    enum: TransactionStatus,
    example: TransactionStatus.CONFIRMED,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({
    description: 'The transaction type',
    enum: TransactionType,
    example: TransactionType.TRANSFER,
    required: false,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiProperty({
    description: 'The number of confirmations',
    example: 12,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  confirmations?: number;

  @ApiProperty({
    description: 'The token symbol',
    example: 'ETH',
    required: false,
  })
  @IsOptional()
  @IsString()
  tokenSymbol?: string;

  @ApiProperty({
    description: 'The token address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { note: 'Payment for services' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
