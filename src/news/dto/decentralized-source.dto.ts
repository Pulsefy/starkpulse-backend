import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export class DecentralizedSourceDto {
  @ApiProperty({ description: 'Source name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Source URL' })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Source type',
    enum: ['RSS', 'API', 'BLOCKCHAIN', 'IPFS', 'SOCIAL'],
  })
  @IsEnum(['RSS', 'API', 'BLOCKCHAIN', 'IPFS', 'SOCIAL'])
  type: 'RSS' | 'API' | 'BLOCKCHAIN' | 'IPFS' | 'SOCIAL';

  @ApiProperty({
    description: 'Reliability score from 0-1',
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  reliabilityScore: number;

  @ApiProperty({ description: 'Last verified timestamp', required: false })
  @IsOptional()
  lastVerified?: Date;

  @ApiProperty({ description: 'Verification method', required: false })
  @IsOptional()
  @IsString()
  verificationMethod?: string;

  @ApiProperty({ description: 'Category tags', required: false })
  @IsOptional()
  categories?: string[];
}

export class SourceVerificationDto {
  @ApiProperty({ description: 'Source identifier' })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: 'Verification status' })
  @IsEnum(['VERIFIED', 'PENDING', 'FAILED', 'FLAGGED'])
  status: 'VERIFIED' | 'PENDING' | 'FAILED' | 'FLAGGED';

  @ApiProperty({ description: 'Verification score from 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  verificationScore: number;

  @ApiProperty({
    description: 'Blockchain hash for verification',
    required: false,
  })
  @IsOptional()
  @IsString()
  blockchainHash?: string;

  @ApiProperty({
    description: 'IPFS hash for content verification',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipfsHash?: string;

  @ApiProperty({ description: 'Verification metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
