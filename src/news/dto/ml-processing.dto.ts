import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export class MLProcessingResultDto {
  @ApiProperty({ description: 'Content quality score from 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  qualityScore: number;

  @ApiProperty({ description: 'Content relevance score from 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  relevanceScore: number;

  @ApiProperty({ description: 'Duplicate detection score from 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  duplicateScore: number;

  @ApiProperty({ description: 'Extracted categories' })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiProperty({ description: 'Extracted keywords' })
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({ description: 'Named entities found' })
  @IsOptional()
  namedEntities?: {
    persons: string[];
    organizations: string[];
    locations: string[];
    cryptocurrencies: string[];
  };

  @ApiProperty({ description: 'Content summary' })
  @IsString()
  summary: string;

  @ApiProperty({ description: 'Processing confidence score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}

export class ContentValidationDto {
  @ApiProperty({ description: 'Content hash for integrity verification' })
  @IsString()
  contentHash: string;

  @ApiProperty({ description: 'Fact-checking score from 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  factCheckScore: number;

  @ApiProperty({ description: 'Source credibility score from 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  credibilityScore: number;

  @ApiProperty({ description: 'Bias detection score from -1 to 1' })
  @IsNumber()
  @Min(-1)
  @Max(1)
  biasScore: number;

  @ApiProperty({ description: 'Validation status' })
  @IsEnum(['VALID', 'SUSPICIOUS', 'INVALID', 'PENDING'])
  status: 'VALID' | 'SUSPICIOUS' | 'INVALID' | 'PENDING';

  @ApiProperty({ description: 'Validation flags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flags?: string[];

  @ApiProperty({
    description: 'External verification sources',
    required: false,
  })
  @IsOptional()
  @IsArray()
  externalSources?: Array<{
    source: string;
    score: number;
    verified: boolean;
  }>;
}

export class RealTimeFeedDto {
  @ApiProperty({ description: 'User ID for personalization' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Feed filters', required: false })
  @IsOptional()
  filters?: {
    categories?: string[];
    sources?: string[];
    minQualityScore?: number;
    minReliabilityScore?: number;
    timeRange?: {
      start: Date;
      end: Date;
    };
  };

  @ApiProperty({ description: 'Maximum articles to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiProperty({ description: 'Sort criteria' })
  @IsOptional()
  @IsEnum(['RELEVANCE', 'QUALITY', 'TIME', 'POPULARITY'])
  sortBy?: 'RELEVANCE' | 'QUALITY' | 'TIME' | 'POPULARITY' = 'RELEVANCE';
}
