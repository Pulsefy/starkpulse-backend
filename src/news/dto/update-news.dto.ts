import { PartialType } from '@nestjs/swagger';
import { CreateNewsDto } from './create-news.dto';

export class UpdateNewsDto extends PartialType(CreateNewsDto) {}
