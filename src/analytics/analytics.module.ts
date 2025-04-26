import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PortfolioSnapshot } from 'src/portfolio/entities/portfolio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioSnapshot])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
