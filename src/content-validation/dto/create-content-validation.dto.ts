import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from "class-validator"
import { ContentType } from "../entities/content-item.entity"

export class CreateContentValidationDto {
  @IsString()
  title: string

  @IsString()
  content: string

  @IsString()
  sourceUrl: string

  @IsString()
  author: string

  @IsString()
  publisher: string

  @IsEnum(ContentType)
  type: ContentType

  @IsDateString()
  publishedAt: Date

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[]

  @IsOptional()
  @IsString()
  summary?: string

  @IsOptional()
  metadata?: Record<string, any>
}
