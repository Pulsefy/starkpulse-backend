import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Username for the user',
    example: 'stark_user123',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'StarkNet wallet address',
    example: '0x123...abc',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
