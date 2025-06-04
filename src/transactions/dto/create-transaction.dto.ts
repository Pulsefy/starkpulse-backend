import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'The transaction hash',
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  @IsString()
  transactionHash: string;

  @ApiProperty({
    description: 'The user ID associated with the transaction',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
