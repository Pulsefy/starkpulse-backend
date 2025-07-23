import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { PortfolioSnapshot } from '../portfolio/entities/portfolio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioSnapshot])],
  providers: [AnalyticsService, PredictiveAnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, PredictiveAnalyticsService],
})
export class AnalyticsModule {}
