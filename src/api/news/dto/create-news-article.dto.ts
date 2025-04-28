import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewsArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  publishedAt?: Date;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  authorId?: number;

  @ApiProperty({ required: false, type: [Number] })
  @IsArray()
  @IsOptional()
  categoryIds?: number[];

  @ApiProperty({ required: false, type: [Number] })
  @IsArray()
  @IsOptional()
  tagIds?: number[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  featuredImage?: string;
}