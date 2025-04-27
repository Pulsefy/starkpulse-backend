import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // ✅ Use official NestJS ConfigModule
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { SessionModule } from './session/session.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { PriceModule } from './price/price.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RpcModule } from './rpc/rpc.module';
// import { ConfigModule } from './config/config.module'; // ✅ if you still have your custom config service

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }), // ✅ THIS ONE
    DatabaseModule,
    HealthModule,
    AuthModule,
    SessionModule,
    PortfolioModule,
    AnalyticsModule,
    BlockchainModule,
    PriceModule,
    NotificationsModule,
    TransactionsModule,
    RpcModule,
    ConfigModule, 
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
