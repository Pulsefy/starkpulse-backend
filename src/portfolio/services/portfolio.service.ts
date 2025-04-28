import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { PortfolioAsset, AssetType } from '../entities/portfolio-asset.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { PortfolioQueryDto } from '../dto/portfolio-query.dto';
import {
  PortfolioResponseDto,
  AssetResponseDto,
} from '../dto/portfolio-response.dto';
import { StarknetService } from '../../blockchain/services/starknet.service';
import { PriceService } from 'src/price/price.service';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @InjectRepository(PortfolioAsset)
    private portfolioAssetRepository: Repository<PortfolioAsset>,
    @InjectRepository(PortfolioSnapshot)
    private portfolioSnapshotRepository: Repository<PortfolioSnapshot>,
    private starknetService: StarknetService,
    private priceService: PriceService,
  ) {}

  async getUserPortfolio(
    userId: string,
    query: PortfolioQueryDto,
  ): Promise<PortfolioResponseDto> {
    const queryBuilder = this.portfolioAssetRepository
      .createQueryBuilder('asset')
      .where('asset.userId = :userId', { userId })
      .andWhere('asset.isHidden = false');

    if (query.assetType) {
      queryBuilder.andWhere('asset.assetType = :assetType', {
        assetType: query.assetType,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(asset.name ILIKE :search OR asset.symbol ILIKE :search OR asset.assetAddress ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const assets = await queryBuilder.getMany();

    // Calculate total value
    let totalValueUsd = '0';
    const assetResponses: AssetResponseDto[] = [];

    for (const asset of assets) {
      const assetResponse = this.mapAssetToResponse(asset);

      if (asset.assetType === AssetType.TOKEN && asset.decimals) {
        try {
          const priceUsd = await this.priceService.getTokenPrice(asset.assetAddress);
          const balanceDecimal = Number(asset.balance) / 10 ** asset.decimals;
          const valueUsd = (balanceDecimal * priceUsd).toString();

          assetResponse.valueUsd = valueUsd;
          totalValueUsd = (Number(totalValueUsd) + Number(valueUsd)).toString();
        } catch (error) {
          this.logger.error(`Failed to get price for token ${asset.assetAddress}`, error.stack);
          assetResponse.valueUsd = '0';
        }
      } else if (asset.assetType === AssetType.NFT && asset.tokenId) {
        try {
          const nftPrice = await this.priceService.getNftPrice(asset.assetAddress, asset.tokenId);
          assetResponse.valueUsd = nftPrice?.toString() || '0';
          totalValueUsd = (Number(totalValueUsd) + Number(assetResponse.valueUsd)).toString();
        } catch (error) {
          this.logger.error(`Failed to get price for NFT ${asset.assetAddress}:${asset.tokenId}`, error.stack);
          assetResponse.valueUsd = '0';
        }
      }

      assetResponses.push(assetResponse);
    }

    const latestAsset = assets.reduce(
      (latest, current) => (latest.lastUpdated > current.lastUpdated ? latest : current),
      assets[0] || { lastUpdated: new Date(0) },
    );

    return {
      totalValueUsd,
      assets: assetResponses,
      lastUpdated: latestAsset.lastUpdated,
    };
  }

  private mapAssetToResponse(asset: PortfolioAsset): AssetResponseDto {
    return {
      id: asset.id,
      assetAddress: asset.assetAddress,
      assetType: asset.assetType,
      tokenId: asset.tokenId,
      balance: asset.balance,
      name: asset.name,
      symbol: asset.symbol,
      decimals: asset.decimals,
      imageUrl: asset.imageUrl,
      metadata: asset.metadata,
      lastUpdated: asset.lastUpdated,
    };
  }

  async syncUserPortfolio(userId: string, walletAddress: string): Promise<void> {
    this.logger.log(`Syncing portfolio for user ${userId} with wallet ${walletAddress}`);
    try {
      await this.syncTokenBalances(userId, walletAddress);
      await this.syncNftHoldings(userId, walletAddress);
      await this.createPortfolioSnapshot(userId);
      this.notifyPortfolioUpdate(userId);
    } catch (error) {
      this.logger.error(`Failed to sync portfolio for user ${userId}`, error.stack);
      throw error;
    }
  }

  private async syncTokenBalances(userId: string, walletAddress: string): Promise<void> {
    this.logger.log(`Syncing token balances for user ${userId}`);
    const tokens = await this.starknetService.getUserTokens(walletAddress);

    for (const token of tokens) {
      const existingAsset = await this.portfolioAssetRepository.findOne({
        where: { userId, assetAddress: token.address, assetType: AssetType.TOKEN },
      });

      if (existingAsset) {
        existingAsset.balance = token.balance;
        existingAsset.lastUpdated = new Date();
        await this.portfolioAssetRepository.save(existingAsset);
      } else {
        const newAsset = this.portfolioAssetRepository.create({
          userId,
          assetAddress: token.address,
          assetType: AssetType.TOKEN,
          balance: token.balance,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          imageUrl: token.logoURI,
        });
        await this.portfolioAssetRepository.save(newAsset);
      }
    }
  }

  private async syncNftHoldings(userId: string, walletAddress: string): Promise<void> {
    this.logger.log(`Syncing NFT holdings for user ${userId}`);
    const nfts = await this.starknetService.getUserNfts(walletAddress);

    for (const nft of nfts) {
      const existingAsset = await this.portfolioAssetRepository.findOne({
        where: { userId, assetAddress: nft.contractAddress, tokenId: nft.tokenId, assetType: AssetType.NFT },
      });

      if (!existingAsset) {
        const newAsset = this.portfolioAssetRepository.create({
          userId,
          assetAddress: nft.contractAddress,
          assetType: AssetType.NFT,
          tokenId: nft.tokenId,
          balance: '1',
          name: nft.name,
          imageUrl: nft.imageUrl,
          metadata: nft.metadata,
        });
        await this.portfolioAssetRepository.save(newAsset);
      }
    }

    const userNfts = await this.portfolioAssetRepository.find({
      where: { userId, assetType: AssetType.NFT },
    });

    for (const userNft of userNfts) {
      const stillOwned = nfts.some(
        (nft) => nft.contractAddress === userNft.assetAddress && nft.tokenId === userNft.tokenId,
      );
      if (!stillOwned) {
        await this.portfolioAssetRepository.remove(userNft);
      }
    }
  }

  private async createPortfolioSnapshot(userId: string): Promise<void> {
    this.logger.log(`Creating portfolio snapshot for user ${userId}`);
    const portfolio = await this.getUserPortfolio(userId, {});

    const snapshot = this.portfolioSnapshotRepository.create({
      userId,
      totalValueUsd: portfolio.totalValueUsd,
      assetBreakdown: portfolio.assets.reduce((acc, asset) => {
        acc[asset.assetAddress] = {
          balance: asset.balance,
          valueUsd: asset.valueUsd || '0',
        };
        return acc;
      }, {} as Record<string, any>),
      timestamp: new Date(),
    });

    await this.portfolioSnapshotRepository.save(snapshot);
  }

  private notifyPortfolioUpdate(userId: string): void {
    this.logger.log(`Notifying user ${userId} about portfolio update`);
    // TODO: Hook into WebSocket/Gateway/Notification system if available
  }

  async getPortfolioHistory(
    userId: string,
    days: number = 30,
  ): Promise<{ date: string; valueUsd: string }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.portfolioSnapshotRepository.find({
      where: { userId, timestamp: MoreThanOrEqual(startDate) },
      order: { timestamp: 'ASC' },
    });

    return snapshots.map((snapshot) => ({
      date: snapshot.timestamp.toISOString().split('T')[0],
      valueUsd: snapshot.totalValueUsd,
    }));
  }

  async getUserAnalytics(userId: string): Promise<any> {
    this.logger.log(`Getting analytics for user ${userId}`);
    const portfolio = await this.getUserPortfolio(userId, {});

    return {
      totalValueUsd: portfolio.totalValueUsd,
      numberOfAssets: portfolio.assets.length,
      lastUpdated: portfolio.lastUpdated,
    };
  }
}
