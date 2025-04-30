import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketData } from './market-data.entity';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    @InjectRepository(MarketData)
    private marketRepo: Repository<MarketData>,
  ) {}

  async fetchAndStoreMarketData(): Promise<void> {
    try {
      const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');

      const now = new Date();
      const entries = Object.entries(res.data).map(([symbol, data]: any) => ({
        symbol: symbol.toUpperCase(),
        priceUsd: data.usd,
        timestamp: now,
      }));

      await this.marketRepo.save(entries);
      this.logger.log(`Stored ${entries.length} market entries`);
    } catch (err) {
      this.logger.error('Failed to fetch market data', err);
    }
  }

  async getAllData(): Promise<MarketData[]> {
    return this.marketRepo.find({
      order: { timestamp: 'DESC' },
    });
  }
}
