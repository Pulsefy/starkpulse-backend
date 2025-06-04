import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
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
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
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
    SecurityModule,
    MonitoringModule,
  ],
  providers: [CacheWarmupService],
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
        { path: 'security/csrf-token', method: RequestMethod.GET }
      )
      .forRoutes('*');
  }
}
