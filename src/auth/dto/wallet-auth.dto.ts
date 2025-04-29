import { IsString, IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalletNonceRequestDto {
  @ApiProperty({
    description: 'StarkNet wallet address',
    example: '0x123...abc',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class WalletAuthRequestDto {
  @ApiProperty({
    description: 'StarkNet wallet address',
    example: '0x123...abc',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Signature array from StarkNet wallet',
    example: ['0x123...abc', '0x456...def'],
  })
  @IsArray()
  @IsNotEmpty()
  signature: string[];

  @ApiProperty({
    description: 'Nonce used for signing',
    example: '0x789...ghi',
  })
  @IsString()
  @IsNotEmpty()
  nonce: string;
}

export class WalletAuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User profile information',
  })
  user: any; // Replace with proper user type
}
