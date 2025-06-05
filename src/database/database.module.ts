import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { DatabaseService } from './database.service';
import { DatabasePerformanceInterceptor } from './interceptors/database-performance.interceptor';
import { QueryCacheService } from './services/query-cache.service';
import { DatabaseHealthService } from './services/database-health.service';
import * as redisStore from 'cache-manager-redis-store';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // Always false in production
        logging:
          configService.get('NODE_ENV') === 'development'
            ? ['query', 'error']
            : ['error'],

        // Connection Pooling Configuration
        extra: {
          max: configService.get('DB_POOL_MAX', 20), // Maximum connections
          min: configService.get('DB_POOL_MIN', 5), // Minimum connections
          acquire: 30000, // Maximum time to get connection
          idle: 10000, // Maximum idle time
          evict: 1000, // Eviction run interval

          // Performance optimizations
          statement_timeout: 30000,
          query_timeout: 30000,
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,

          // SSL configuration for production
          ssl:
            configService.get('NODE_ENV') === 'production'
              ? {
                  rejectUnauthorized: false,
                }
              : false,
        },

        // Query optimization
        cache: {
          type: 'redis',
          options: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            ttl: 600, // 10 minutes default TTL
          },
        },

        // Migration configuration
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false, // Run manually
        migrationsTableName: 'migrations_history',
      }),
      inject: [ConfigService],
    }),

    // Redis Cache Module
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        ttl: 600, // 10 minutes
        max: 1000, // Maximum cached items
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    DatabaseService,
    DatabasePerformanceInterceptor,
    QueryCacheService,
    DatabaseHealthService,
  ],
  exports: [DatabaseService, QueryCacheService, DatabaseHealthService],
})
export class DatabaseModule {}
