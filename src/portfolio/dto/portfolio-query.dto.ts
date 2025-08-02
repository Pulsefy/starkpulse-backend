import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetType } from '../entities/portfolio-asset.entity';

export class PortfolioQueryDto {
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;

  @IsOptional()
  @IsString()
  search?: string;
}
