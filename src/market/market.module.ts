import { Module } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { MarketService } from './market.service';

@Module({
  providers: [MarketGateway, MarketService],
})
export class MarketModule {}
