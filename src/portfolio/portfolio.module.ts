import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioAsset } from './entities/portfolio-asset.entity';
import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';
import { PortfolioService } from './services/portfolio.service';
import { PortfolioAnalyticsService } from './services/portfolio-analytics.service';
import { PortfolioGateway } from './gateways/portfolio.gateway';
import { PriceModule } from '../price/price.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PortfolioController } from './portfolio.controller';
import { PortfolioAnalyticsController } from './controllers/portfolio-analytics.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortfolioAsset, PortfolioSnapshot]),
    BlockchainModule,
    PriceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [PortfolioController, PortfolioAnalyticsController],
  providers: [PortfolioService, PortfolioAnalyticsService, PortfolioGateway],
  exports: [PortfolioService, PortfolioAnalyticsService],
})
export class PortfolioModule {}
