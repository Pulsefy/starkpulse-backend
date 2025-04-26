import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PriceModule } from './price/price.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    PortfolioModule,
    BlockchainModule,
    PriceModule,
    // Add other modules here as needed
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
