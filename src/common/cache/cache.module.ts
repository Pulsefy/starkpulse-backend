import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheWarmupService } from './cache-warmup.service';
import { CacheService } from './cache.service';
import { RedisModule } from '../module/redis/redis.module';
import { DatabaseModule } from '../../database/database.module';

@Global()
@Module({
  imports: [
    HttpModule,
    RedisModule,
    ConfigModule,
    // Multi-store cache configuration
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const stores = [];
        
        // Memory store for frequently accessed small data
        stores.push({
          store: 'memory',
          max: configService.get('MEMORY_CACHE_MAX_ITEMS', 1000),
          ttl: configService.get('MEMORY_CACHE_TTL', 60), // 1 minute
        });
        
        // Redis store for larger, shared data
        const isClusterEnabled = configService.get('REDIS_CLUSTER_ENABLED', false);
        
        if (isClusterEnabled) {
          const clusterNodes = configService
            .get('REDIS_CLUSTER_NODES', 'localhost:7000,localhost:7001,localhost:7002')
            .split(',')
            .map((node) => {
              const [host, port] = node.split(':');
              return { host, port: parseInt(port) };
            });
            
          stores.push({
            store: redisStore,
            cluster: {
              enableReadyCheck: false,
              redisOptions: {
                password: configService.get('REDIS_PASSWORD'),
                connectTimeout: 10000,
                commandTimeout: 5000,
                retryDelayOnFailover: 100,
                enableOfflineQueue: false,
                maxRetriesPerRequest: 3,
              },
              nodes: clusterNodes,
            },
            ttl: configService.get('REDIS_CACHE_TTL', 600), // 10 minutes
          });
        } else {
          stores.push({
            store: redisStore,
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            ttl: configService.get('REDIS_CACHE_TTL', 600),
          });
        }
        
        return {
          stores,
          // Cache chain configuration - memory first, then Redis
          isCacheableValue: (value: any) => value !== null && value !== undefined,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    CacheWarmupService,
    CacheService,
  ],
  exports: [
    CacheWarmupService,
    CacheService,
    NestCacheModule,
  ],
})
export class CacheModule {}
import { HttpModule } from '@nestjs/axios';
import { CacheWarmupService } from './cache-warmup.service';
import { RedisModule } from '../module/redis/redis.module';
import { CacheService } from './cahce.service';

@Module({
  imports: [HttpModule],
  providers: [CacheWarmupService],
  exports: [CacheWarmupService],
})
export class CacheWarmupModule {}

@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
