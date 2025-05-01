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
import { NewsModule } from './news/news.module';

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
    BlockchainModule,
    EventEmitterModule.forRoot(),
    NewsModule,
    // Add other modules here as needed
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
