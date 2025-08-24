import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketDataService } from './services/market-data.service';
import { TechnicalIndicatorsService } from './services/technical-indicators.service';
import { SentimentAnalysisService } from './services/sentiment-analysis.service';
import { DataValidationService } from './services/data-validation.service';
import { MarketDataController } from './controllers/market-data.controller';
import { MarketData } from './entities/market-data.entity';
import { DataSource } from './entities/data-source.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketData, DataSource]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    TechnicalIndicatorsService,
    SentimentAnalysisService,
    DataValidationService,
  ],
  exports: [
    MarketDataService,
    TechnicalIndicatorsService,
    SentimentAnalysisService,
  ],
})
export class MarketDataModule {}
