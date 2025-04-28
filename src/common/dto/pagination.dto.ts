import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsNumber()
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  category?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  tag?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  author?: number;
}