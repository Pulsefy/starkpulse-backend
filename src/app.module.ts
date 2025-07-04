import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';



// Change the import
import { CacheWarmupModule } from './common/cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { DataPipelineModule } from './data-pipeline/data-pipeline.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
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
import { SecurityModule } from './common/security/security.module';
import { PrivacyModule } from './privacy/privacy.module';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
// import configuration from './config/configuration';
import { RateLimitModule } from './common/module/rate-limit.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { RateLimitLoggingInterceptor } from './common/interceptors/rate-limit-logging.interceptor';
import { MonitoringModule } from './monitoring/monitoring.module';
import { EventProcessingModule } from './event-processing/event-processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(`${process.env.REDIS_PORT}`),
      },
    }),
    BullModule.registerQueue(
      { name: 'event-queue' },
      { name: 'dead-letter-queue' }
    ),
    EventProcessingModule,
    CacheWarmupModule, 
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 1000,
      },
    ]),
    RateLimitModule.forRoot(),
    CacheWarmupModule, 
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
    DataPipelineModule,
    AnalyticsModule,
    BlockchainModule,
    PriceModule,
    NotificationsModule,
    TransactionsModule,
    UsersModule,
    MarketDataModule,
    NewsModule,
    MarketModule,
    SecurityModule,
    MonitoringModule,
    CacheWarmupService,
    // GDPR/Privacy
    PrivacyModule,
    // Remove CacheWarmupService from here since it's now provided by CacheWarmupModule
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');

    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');

    consumer
      .apply(CsrfMiddleware)
      .exclude(
        { path: 'api/health', method: RequestMethod.ALL },
        { path: 'api/auth/wallet/nonce', method: RequestMethod.ALL },
        { path: 'api/auth/wallet/verify', method: RequestMethod.ALL },
        { path: 'api/blockchain/events/webhook', method: RequestMethod.ALL },
        { path: 'security/csrf-token', method: RequestMethod.GET },
      )
      .forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
