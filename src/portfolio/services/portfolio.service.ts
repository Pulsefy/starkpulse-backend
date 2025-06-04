import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  PortfolioAsset,
  AssetType,
} from '../entities/portfolio-asset.entity';
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

  /**
   * 1. Fetch all assets for this user (tokens & NFTs).
   * 2. Calculate each asset’s USD value (using PriceService).
   * 3. Sum them up → totalValueUsd.
   * 4. Create a PortfolioSnapshot.
   * 5. Return a PortfolioResponseDto (current).
   */
  async syncUserPortfolio(
    userId: string,
    walletAddress: string,
  ): Promise<PortfolioResponseDto> {
    this.logger.log(`Syncing portfolio for user ${userId} (wallet: ${walletAddress})`);

    // 1) Sync tokens from StarkNet
    await this.syncTokenBalances(userId, walletAddress);

    // 2) Sync NFTs from StarkNet
    await this.syncNftHoldings(userId, walletAddress);

    // 3) Create a snapshot of the portfolio right now
    await this.createPortfolioSnapshot(userId);

    // 4) Return the “current portfolio” (so caller can immediately see it)
    return await this.getUserPortfolio(userId, {});
  }

  /**
   * Get a user's current portfolio (assets + totalValueUsd).
   * Optionally filter by assetType or search string.
   */
  async getUserPortfolio(
    userId: string,
    query: PortfolioQueryDto,
  ): Promise<PortfolioResponseDto> {
    const qb = this.portfolioAssetRepository
      .createQueryBuilder('asset')
      .where('asset.userId = :userId', { userId })
      .andWhere('asset.isHidden = false');

    if (query.assetType) {
      qb.andWhere('asset.assetType = :assetType', { assetType: query.assetType });
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
          const priceUsd = await this.priceService.getTokenPrice(asset.assetAddress);
          const balanceDecimal = Number(asset.balance) / 10 ** asset.decimals;
          const valueUsd = (balanceDecimal * priceUsd).toFixed(2);
          response.valueUsd = valueUsd;
          totalValueUsd = (Number(totalValueUsd) + Number(valueUsd)).toFixed(2);
        } catch (err) {
          this.logger.error(`Failed to fetch token price for ${asset.assetAddress}`, err);
          response.valueUsd = '0';
        }
      }
      // If NFT, fetch floor price or estimated price
      else if (asset.assetType === AssetType.NFT && asset.tokenId) {
        try {
          const nftPrice = await this.priceService.getNftPrice(asset.assetAddress, asset.tokenId);
          const valueUsd = nftPrice ? nftPrice.toFixed(2) : '0';
          response.valueUsd = valueUsd;
          totalValueUsd = (Number(totalValueUsd) + Number(valueUsd)).toFixed(2);
        } catch (err) {
          this.logger.error(`Failed to fetch NFT price for ${asset.assetAddress}:${asset.tokenId}`, err);
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

  /**
   * Private helper: map a PortfolioAsset to AssetResponseDto
   */
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

  /**
   * Sync all ERC‐20 token balances for this user’s wallet on StarkNet.
   * For each token found, either create a new PortfolioAsset or update existing one.
   */
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
          userId,
          assetAddress: token.address,
          assetType: AssetType.TOKEN,
          balance: token.balance,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          imageUrl: token.logoURI,
          metadata: null,
          isHidden: false,
          lastUpdated: new Date(),
        });
        await this.portfolioAssetRepository.save(newAsset);
      }
    }
  }

  /**
   * Sync all NFTs for this user’s wallet on StarkNet.
   * Creates new PortfolioAsset entries for any newly discovered NFTs,
   * and removes any that the user no longer owns.
   */
  private async syncNftHoldings(userId: string, walletAddress: string) {
    const nfts = await this.starknetService.getUserNfts(walletAddress);

    // 1) Add any new NFTs or update existing ones
    for (const nft of nfts) {
      const existing = await this.portfolioAssetRepository.findOne({
        where: {
          userId,
          assetAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          assetType: AssetType.NFT,
// src/portfolio/services/portfolio.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  PortfolioAsset,
  AssetType,
} from '../entities/portfolio-asset.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { PortfolioQueryDto } from '../dto/portfolio-query.dto';
import {
  PortfolioResponseDto,
  AssetResponseDto,
} from '../dto/portfolio-response.dto';
import { StarknetService } from 'src/blockchain/services/starknet.service';
import { PriceService } from 'src/price/price.service';

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

  /**
   * 1. Fetch all assets for this user (tokens & NFTs).
   * 2. Calculate each asset’s USD value (using PriceService).
   * 3. Sum them up → totalValueUsd.
   * 4. Create a PortfolioSnapshot.
   * 5. Return a PortfolioResponseDto (current).
   */
  async syncUserPortfolio(
    userId: string,
    walletAddress: string,
  ): Promise<PortfolioResponseDto> {
    this.logger.log(`Syncing portfolio for user ${userId} (wallet: ${walletAddress})`);

    // 1) Sync tokens from StarkNet
    await this.syncTokenBalances(userId, walletAddress);

    // 2) Sync NFTs from StarkNet
    await this.syncNftHoldings(userId, walletAddress);

    // 3) Create a snapshot of the portfolio right now
    await this.createPortfolioSnapshot(userId);

    // 4) Return the “current portfolio” (so caller can immediately see it)
    return await this.getUserPortfolio(userId, {});
  }

  /**
   * Get a user's current portfolio (assets + totalValueUsd).
   * Optionally filter by assetType or search string.
   */
  async getUserPortfolio(
    userId: string,
    query: PortfolioQueryDto,
  ): Promise<PortfolioResponseDto> {
    const qb = this.portfolioAssetRepository
      .createQueryBuilder('asset')
      .where('asset.userId = :userId', { userId })
      .andWhere('asset.isHidden = false');

    if (query.assetType) {
      qb.andWhere('asset.assetType = :assetType', { assetType: query.assetType });
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
          const priceUsd = await this.priceService.getTokenPrice(asset.assetAddress);
          const balanceDecimal = Number(asset.balance) / 10 ** asset.decimals;
          const valueUsd = (balanceDecimal * priceUsd).toFixed(2);
          response.valueUsd = valueUsd;
          totalValueUsd = (Number(totalValueUsd) + Number(valueUsd)).toFixed(2);
        } catch (err) {
          this.logger.error(`Failed to fetch token price for ${asset.assetAddress}`, err);
          response.valueUsd = '0';
        }
      }
      // If NFT, fetch floor price or estimated price
      else if (asset.assetType === AssetType.NFT && asset.tokenId) {
        try {
          const nftPrice = await this.priceService.getNftPrice(asset.assetAddress, asset.tokenId);
          const valueUsd = nftPrice ? nftPrice.toFixed(2) : '0';
          response.valueUsd = valueUsd;
          totalValueUsd = (Number(totalValueUsd) + Number(valueUsd)).toFixed(2);
        } catch (err) {
          this.logger.error(`Failed to fetch NFT price for ${asset.assetAddress}:${asset.tokenId}`, err);
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

  /**
   * Private helper: map a PortfolioAsset to AssetResponseDto
   */
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

  /**
   * Sync all ERC‐20 token balances for this user’s wallet on StarkNet.
   * For each token found, either create a new PortfolioAsset or update existing one.
   */
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
          userId,
          assetAddress: token.address,
          assetType: AssetType.TOKEN,
          balance: token.balance,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          imageUrl: token.logoURI,
          metadata: null,
          isHidden: false,
          lastUpdated: new Date(),
        });
        await this.portfolioAssetRepository.save(newAsset);
      }
    }
  }

 
  private async syncNftHoldings(userId: string, walletAddress: string) {
    const nfts = await this.starknetService.getUserNfts(walletAddress);

    // 1) Add any new NFTs or update existing ones
    for (const nft of nfts) {
      const existing = await this.portfolioAssetRepository.findOne({
        where: {
          userId,
          assetAddress: nft.contractAddress,
          tokenId: nft.tokenId,
          assetType: AssetType.NFT,
