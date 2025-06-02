import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PriceModule } from './price/price.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { PreferencesModule } from './preferences/module/preferences.module';
import { SessionModule } from './session/session.module';
import { MarketModule } from './market/market.module';
import { NewsModule } from './news/news.module';
import { MarketDataModule } from './market-data/market-data.module';
import { CacheWarmupService } from './common/cache/cache-warmup.service';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { RateLimitModule } from './common/module/rate-limit.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { RateLimitLoggingInterceptor } from './common/interceptors/rate-limit-logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CacheModule.register({
    isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 1000,
    }),
    RateLimitModule.forRoot(),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitLoggingInterceptor,
    },
    DatabaseModule,
    HealthModule,
    AuthModule,
    PreferencesModule,
    SessionModule,
    PortfolioModule,
    AnalyticsModule,
    BlockchainModule,
    PriceModule,
    NotificationsModule,
    TransactionsModule,
    UsersModule,
    MarketDataModule,
    NewsModule,
    MarketModule,
    CacheWarmupService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*'); 

  }
}
