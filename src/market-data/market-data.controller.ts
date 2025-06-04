import { Controller, Get } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Market Data')
@ApiBearerAuth()
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketService: MarketDataService) {}

  @Get()
  @ApiOperation({ summary: 'Get all market data', description: 'Returns all available market data.' })
  @ApiResponse({ status: 200, description: 'Market data retrieved', example: { data: [{ symbol: 'ETH', price: 3500.25, volume24h: 1000000, marketCap: 50000000 }], lastUpdated: '2025-06-03T10:00:00.000Z' } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getMarketData() {
    return this.marketService.getAllData();
  }
}
