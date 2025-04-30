import { Controller, Get } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketService: MarketDataService) {}

  @Get()
  async getMarketData() {
    return this.marketService.getAllData();
  }
}
