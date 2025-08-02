import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrackTransactionDto {
  @ApiProperty({
    description: 'Transaction hash to track',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;
}
