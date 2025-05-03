import { CreatePriceDto } from './dto/create-price.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NftPrice } from './entities/nft-price.entity';
import { TokenPrice } from './entities/token-price.entity';
import { PriceAlert } from './entities/price.entity';
import { PriceFetcherService } from './price-fetcher.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class PriceService implements OnModuleInit {
  private readonly logger = new Logger(PriceService.name);
  private priceCache: Map<string, { price: number; timestamp: Date }> =
    new Map();

  constructor(
    @InjectRepository(TokenPrice)
    private tokenPriceRepository: Repository<TokenPrice>,

    @InjectRepository(NftPrice)
    private nftPriceRepository: Repository<NftPrice>,

    @InjectRepository(PriceAlert)
    private readonly priceAlertRepo: Repository<PriceAlert>,

    private readonly priceFetcher: PriceFetcherService,

    private readonly notificationService:NotificationsService,

    private httpService: HttpService,

    private configService: ConfigService
  ) {}
  create(createPriceDto: CreatePriceDto) {
    return 'This action adds a new price';
  }

  findAll() {
    return `This action returns all price`;
  }

  findOne(id: number) {
    return `This action returns a #${id} price`;
  }

  update(id: number, updatePriceDto: UpdatePriceDto) {
    return `This action updates a #${id} price`;
  }

  remove(id: number) {
    return `This action removes a #${id} price`;
  }

  async onModuleInit() {
    await this.refreshPriceCache();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshPriceCache() {
    this.logger.log('Refreshing price cache');
    try {
      const tokenPrices = await this.tokenPriceRepository.find({
        where: {
          updatedAt: MoreThanOrEqual(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
          ), // Last 24 hours
        },
      });

      for (const price of tokenPrices) {
        this.priceCache.set(price.tokenAddress, {
          price: parseFloat(price.priceUsd),
          timestamp: price.updatedAt,
        });
      }
      this.logger.log(`Cached ${tokenPrices.length} token prices`);
    } catch (error) {
      this.logger.error('Failed to refresh price cache', error);
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp.getTime() < 30 * 60 * 1000) {
      return cached.price;
    }

    // Check database
    const storedPrice = await this.tokenPriceRepository.findOne({
      where: { tokenAddress },
      order: { updatedAt: 'DESC' },
    });

    if (
      storedPrice &&
      Date.now() - storedPrice.updatedAt.getTime() < 30 * 60 * 1000
    ) {
      // Update cache and return
      this.priceCache.set(tokenAddress, {
        price: parseFloat(storedPrice.priceUsd),
        timestamp: storedPrice.updatedAt,
      });
      return parseFloat(storedPrice.priceUsd);
    }

    // Fetch fresh price
    return this.fetchAndStoreTokenPrice(tokenAddress);
  }

  private async fetchAndStoreTokenPrice(tokenAddress: string): Promise<number> {
    try {
      // Get price from API
      const apiKey = this.configService.get<string>('PRICE_API_KEY');
      const apiUrl = this.configService.get<string>('PRICE_API_URL');

      const response = await lastValueFrom(
        this.httpService.get(`${apiUrl}/tokens/price`, {
          params: {
            address: tokenAddress,
            chain: 'starknet',
            apiKey,
          },
        }),
      );

      if (!response.data || !response.data.price) {
        throw new Error(`Invalid price data for token ${tokenAddress}`);
      }

      const priceUsd = response.data.price.toString();

      // Store in database
      const tokenPrice = this.tokenPriceRepository.create({
        tokenAddress,
        priceUsd,
        sourceName: 'external_api',
      });
      await this.tokenPriceRepository.save(tokenPrice);

      // Update cache
      const price = parseFloat(priceUsd);
      this.priceCache.set(tokenAddress, {
        price,
        timestamp: new Date(),
      });

      return price;
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for token ${tokenAddress}`,
        error,
      );

      // Return last known price if available
      const lastPrice = await this.tokenPriceRepository.findOne({
        where: { tokenAddress },
        order: { updatedAt: 'DESC' },
      });

      if (lastPrice) {
        return parseFloat(lastPrice.priceUsd);
      }

      // Default to zero if no price is available
      return 0;
    }
  }

  async getNftPrice(
    contractAddress: string,
    tokenId: string,
  ): Promise<number | null> {
    try {
      // Check database first
      const storedPrice = await this.nftPriceRepository.findOne({
        where: { contractAddress, tokenId },
        order: { updatedAt: 'DESC' },
      });

      if (
        storedPrice &&
        Date.now() - storedPrice.updatedAt.getTime() < 24 * 60 * 60 * 1000
      ) {
        return parseFloat(storedPrice.priceUsd);
      }

      // If not found or outdated, fetch from API
      const apiKey = this.configService.get<string>('NFT_PRICE_API_KEY');
      const apiUrl = this.configService.get<string>('NFT_PRICE_API_URL');

      const response = await lastValueFrom(
        this.httpService.get(`${apiUrl}/nfts/price`, {
          params: {
            contractAddress,
            tokenId,
            chain: 'starknet',
            apiKey,
          },
        }),
      );

      if (!response.data || !response.data.price) {
        return storedPrice ? parseFloat(storedPrice.priceUsd) : null;
      }

      const priceUsd = response.data.price.toString();

      // Store in database
      const nftPrice = this.nftPriceRepository.create({
        contractAddress,
        tokenId,
        priceUsd,
        sourceName: 'external_api',
      });
      await this.nftPriceRepository.save(nftPrice);

      return parseFloat(priceUsd);
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for NFT ${contractAddress}:${tokenId}`,
        error,
      );

      // Return last known price if available
      const lastPrice = await this.nftPriceRepository.findOne({
        where: { contractAddress, tokenId },
        order: { updatedAt: 'DESC' },
      });

      if (lastPrice) {
        return parseFloat(lastPrice.priceUsd);
      }

      return null;
    }
  }

  async getHistoricalTokenPrices(
    tokenAddress: string,
    days: number = 30,
  ): Promise<{ date: string; price: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const prices = await this.tokenPriceRepository.find({
      where: {
        tokenAddress,
        updatedAt: MoreThanOrEqual(startDate),
      },
      order: {
        updatedAt: 'ASC',
      },
    });

    // Group by day and get the closing price
    const dailyPrices = new Map<string, number>();
    for (const price of prices) {
      const date = price.updatedAt.toISOString().split('T')[0];
      dailyPrices.set(date, parseFloat(price.priceUsd));
    }

    return Array.from(dailyPrices.entries()).map(([date, price]) => ({
      date,
      price,
    }));
  }

  async checkAndTriggerAlerts(): Promise<void> {
    const alerts = await this.priceAlertRepo.find({
      where: { triggered: false },
    });

    for (const alert of alerts) {
      const currentPrice = await this.priceFetcher.getTokenPrice(alert.tokenSymbol);

      const shouldTrigger =
        (alert.direction === 'above' && currentPrice > alert.threshold) ||
        (alert.direction === 'below' && currentPrice < alert.threshold);

      if (shouldTrigger) {
        await this.notificationService.send({
          userId: alert.userId,
          title: `Price Alert: ${alert.tokenSymbol}`,
          content: `${alert.tokenSymbol} is now ${currentPrice}, which is ${alert.direction} your threshold of ${alert.threshold}.`,
          channel: 'in_app',
          metadata: {
            token: alert.tokenSymbol,
            threshold: alert.threshold,
            currentPrice,
            direction: alert.direction,
          },
        });

        alert.triggered = true;
        await this.priceAlertRepo.save(alert);

        this.logger.log(`Triggered price alert for ${alert.userId} on ${alert.tokenSymbol}`);
      }
    }
  }

}
