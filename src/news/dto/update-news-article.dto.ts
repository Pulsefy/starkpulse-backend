import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsArticleDto } from './create-news-article.dto';
import { IsOptional } from 'class-validator';

export class UpdateNewsArticleDto extends PartialType(CreateNewsArticleDto) {
  @IsOptional()
  publishedAt?: Date;
}