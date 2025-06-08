import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class PersonalizedFeedDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsNumber()
  limit?: number = 50;
}

export class UserPreferencesDto {
  @IsString()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsArray()
  @IsString({ each: true })
  sources: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedSources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  sentimentPreference?: 'positive' | 'negative' | 'neutral' | 'all';
}
