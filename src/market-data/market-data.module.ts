// market-data.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketData } from './market-data.entity';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataScheduler } from './market-data.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([MarketData])],
  controllers: [MarketDataController],
  providers: [MarketDataService, MarketDataScheduler],
})
export class MarketDataModule {}
