import { AssetType } from '../entities/portfolio-asset.entity';

export class AssetResponseDto {
  id: string;
  assetAddress: string;
  assetType: AssetType;
  tokenId?: string;
  balance: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  imageUrl?: string;
  metadata?: Record<string, any>;
  valueUsd?: string;
  lastUpdated: Date;
}

export class PortfolioResponseDto {
  totalValueUsd: string;
  assets: AssetResponseDto[];
  lastUpdated: Date;
}
