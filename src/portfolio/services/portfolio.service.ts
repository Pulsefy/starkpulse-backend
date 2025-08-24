import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
import { PriceService } from '../../price/price.service';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @InjectRepository(PortfolioAsset)
    private readonly portfolioAssetRepository: Repository<PortfolioAsset>,

    @InjectRepository(PortfolioSnapshot)
    private readonly portfolioSnapshotRepository: Repository<PortfolioSnapshot>,

    private readonly starknetService: StarknetService,
    private readonly priceService: PriceService,
  ) {}

  async syncUserPortfolio(
    userId: string,
    walletAddress: string,
  ): Promise<PortfolioResponseDto> {
    this.logger.log(
      `Syncing portfolio for user ${userId} (wallet: ${walletAddress})`,
    );

    await this.syncTokenBalances(userId, walletAddress);

    await this.syncNftHoldings(userId, walletAddress);

    await this.createPortfolioSnapshot(userId);

    return await this.getUserPortfolio(userId, {});
  }

  async getUserPortfolio(
    userId: string,
    query: PortfolioQueryDto,
  ): Promise<PortfolioResponseDto> {
    const qb = this.portfolioAssetRepository
      .createQueryBuilder('asset')
      .where('asset.userId = :userId', { userId })
      .andWhere('asset.isHidden = false');

    if (query.assetType) {
      qb.andWhere('asset.assetType = :assetType', {
        assetType: query.assetType,
      });
    }
    if (query.search) {
      qb.andWhere(
        '(asset.name ILIKE :search OR asset.symbol ILIKE :search OR asset.assetAddress ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const assets = await qb.getMany();
    let totalValueUsd = '0';
    const assetResponses: AssetResponseDto[] = [];

    for (const asset of assets) {
      const response = this.mapAssetToResponse(asset);

      // If it’s a token, fetch price and compute USD value
      if (asset.assetType === AssetType.TOKEN && asset.decimals) {
        try {
          const priceUsd = await this.priceService.getTokenPrice(
            asset.assetAddress,
          );
          const balanceDecimal = Number(asset.balance) / 10 ** asset.decimals;
          const valueUsd = (balanceDecimal * priceUsd).toFixed(2);
          response.valueUsd = valueUsd;
          totalValueUsd = (Number(totalValueUsd) + Number(valueUsd)).toFixed(2);
        } catch (err) {
          this.logger.error(
            `Failed to fetch token price for ${asset.assetAddress}`,
            err,
          );
          response.valueUsd = '0';
        }
      } else if (asset.assetType === AssetType.NFT && asset.tokenId) {
        try {
          const nftPrice = await this.priceService.getNftPrice(
            asset.assetAddress,
            asset.tokenId,
          );
          const valueUsd = nftPrice ? nftPrice.toFixed(2) : '0';
          response.valueUsd = valueUsd;
          totalValueUsd = (Number(totalValueUsd) + Number(valueUsd)).toFixed(2);
        } catch (err) {
          this.logger.error(
            `Failed to fetch NFT price for ${asset.assetAddress}:${asset.tokenId}`,
            err,
          );
          response.valueUsd = '0';
        }
      }

      assetResponses.push(response);
    }

    // Determine “lastUpdated” by taking the max lastUpdated among all assets
    const lastUpdatedAsset =
      assets.length > 0
        ? assets.reduce((a, b) => (a.lastUpdated > b.lastUpdated ? a : b))
        : { lastUpdated: new Date(0) };

    return {
      totalValueUsd,
      assets: assetResponses,
      lastUpdated: lastUpdatedAsset.lastUpdated,
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
      valueUsd: '0', // will be overwritten if price fetch succeeds
    };
  }

  private async syncTokenBalances(userId: string, walletAddress: string) {
    const tokens = await this.starknetService.getUserTokens(walletAddress);

    for (const token of tokens) {
      const existing = await this.portfolioAssetRepository.findOne({
        where: {
          userId,
          assetAddress: token.address,
          assetType: AssetType.TOKEN,
        },
      });

      if (existing) {
        existing.balance = token.balance;
        existing.lastUpdated = new Date();
        await this.portfolioAssetRepository.save(existing);
      } else {
        const newAsset = this.portfolioAssetRepository.create({
          assetAddress: token.address,
          assetType: AssetType.TOKEN,
          balance: token.balance,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          imageUrl: token.logoURI || undefined, // Use undefined instead of null
          isHidden: false,
        });

        // Set the user relationship and userId separately
        newAsset.user = { id: userId } as any;
        newAsset.userId = userId;
        await this.portfolioAssetRepository.save(newAsset);
      }
    }
  }

  private async syncNftHoldings(userId: string, walletAddress: string) {
    const nfts = await this.starknetService.getUserNfts(walletAddress);

    for (const nft of nfts) {
      const existing = await this.portfolioAssetRepository.findOne({
        where: {
          userId,
          assetAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          assetType: AssetType.NFT,
        },
      });

      if (existing) {
        existing.lastUpdated = new Date();
        await this.portfolioAssetRepository.save(existing);
      } else {
        const newAsset = this.portfolioAssetRepository.create({
          userId,
          assetAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          assetType: AssetType.NFT,
          balance: '1',
          name: nft.name,
          symbol: nft.name || '', // Use name instead of symbol for NFTs
          decimals: 0,
          imageUrl: nft.imageUrl,
          metadata: nft.metadata || null,
          isHidden: false,
          lastUpdated: new Date(),
        });
        await this.portfolioAssetRepository.save(newAsset);
      }
    }
  }

  async getPortfolioHistory(userId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.portfolioSnapshotRepository.find({
      where: {
        userId,
        createdAt: MoreThanOrEqual(startDate),
      },
      order: { createdAt: 'ASC' },
    });

    return snapshots.map((snapshot) => ({
      date: snapshot.createdAt,
      totalValue: snapshot.totalValueUsd,
      assetCount: snapshot.assetCount,
    }));
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<any> {
    const portfolio = await this.getUserPortfolio(userId, {});
    const totalValue = portfolio.assets.reduce(
      (sum, asset) => sum + (Number(asset.valueUsd) || 0), // Convert to number
      0,
    );

    const historicalData = await this.getPortfolioHistory(userId, 30);
    const performance = this.calculatePerformanceMetrics(historicalData);

    return {
      totalValue,
      assetCount: portfolio.assets.length,
      performance,
      historicalData,
    };
  }

  /**
   * Create a portfolio snapshot
   */
  async createPortfolioSnapshot(userId: string): Promise<void> {
    const portfolio = await this.getUserPortfolio(userId, {});

    const snapshot = this.portfolioSnapshotRepository.create({
      userId,
      totalValueUsd: portfolio.totalValueUsd,
      assetCount: portfolio.assets.length,
      createdAt: new Date(),
    });

    await this.portfolioSnapshotRepository.save(snapshot);
    this.logger.log(`Created portfolio snapshot for user ${userId}`);
  }

  /**
   * Calculate performance metrics from historical data
   */
  private calculatePerformanceMetrics(historicalData: any[]): any {
    if (historicalData.length < 2) {
      return {
        dailyChange: 0,
        weeklyChange: 0,
        monthlyChange: 0,
      };
    }

    const latest = historicalData[historicalData.length - 1].totalValue;
    const previous = historicalData[historicalData.length - 2].totalValue;

    const dailyChange = previous ? ((latest - previous) / previous) * 100 : 0;

    return {
      dailyChange,
      weeklyChange: 0, // Implement based on your needs
      monthlyChange: 0, // Implement based on your needs
    };
  }
}
