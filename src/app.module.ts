import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Existing modules
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PreferencesModule } from './preferences/module/preferences.module';
import { SessionModule } from './session/session.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { PriceModule } from './price/price.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

// New module
// import { NewsModule } from './news/news.module';

// Middleware
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { NewsModule } from './api/news/news.module';

@Module({
  imports: [
    // Global modules
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    
    // Database configuration (replacing DatabaseModule with direct TypeORM config)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production', // safer sync setting
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Application feature modules
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
    
    // New News module
    NewsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}