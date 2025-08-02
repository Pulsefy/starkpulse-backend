import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketDataService } from './market-data.service';

@Injectable()
export class MarketDataScheduler {
  constructor(private readonly marketService: MarketDataService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCron() {
    this.marketService.fetchAndStoreMarketData();
  }
}
