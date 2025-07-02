import { Global, Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { CacheModule } from "@nestjs/cache-manager"
import { DatabaseService } from "./database.service"
import { QueryCacheService } from "./services/query-cache.service"
import { DatabaseHealthService } from "./services/database-health.service"
import { redisStore } from "cache-manager-ioredis-yet"
import { RedisClusterService } from "./services/redis-cluster.service"
import { CacheCompressionService } from "./services/cache-compression.service"
import { CacheAnalyticsService } from "./services/cache-analytics.service"
import { CacheInvalidationService } from "./services/cache-invalidation.service"

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DB_HOST", "localhost"),
        port: configService.get("DB_PORT", 5432),
        username: configService.get("DB_USERNAME"),
        password: configService.get("DB_PASSWORD"),
        database: configService.get("DB_NAME"),
        autoLoadEntities: true,
        synchronize: false, // Always false in production
        logging: configService.get("NODE_ENV") === "development" ? ["query", "error"] : ["error"],

        // Connection Pooling Configuration
        extra: {
          max: configService.get("DB_POOL_MAX", 20), // Maximum connections
          min: configService.get("DB_POOL_MIN", 5), // Minimum connections
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
            configService.get("NODE_ENV") === "production"
              ? {
                  rejectUnauthorized: false,
                }
              : false,
        },

        // Query optimization with Redis cluster cache
        cache: {
          type: "redis",
          options: {
            host: configService.get("REDIS_HOST", "localhost"),
            port: configService.get("REDIS_PORT", 6379),
            ttl: 600, // 10 minutes default TTL
            // Redis Cluster configuration
            cluster: configService.get("REDIS_CLUSTER_ENABLED", false)
              ? {
                  enableReadyCheck: false,
                  redisOptions: {
                    password: configService.get("REDIS_PASSWORD"),
                  },
                  nodes: configService
                    .get("REDIS_CLUSTER_NODES", "localhost:7000,localhost:7001,localhost:7002")
                    .split(",")
                    .map((node) => {
                      const [host, port] = node.split(":")
                      return { host, port: Number.parseInt(port) }
                    }),
                }
              : undefined,
          },
        },

        // Migration configuration
        migrations: ["dist/database/migrations/*.js"],
        migrationsRun: false, // Run manually
        migrationsTableName: "migrations_history",
      }),
      inject: [ConfigService],
    }),

    // Enhanced Redis Cache Module with Cluster Support
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isClusterEnabled = configService.get("REDIS_CLUSTER_ENABLED", false)

        if (isClusterEnabled) {
          // Redis Cluster Configuration
          const clusterNodes = configService
            .get("REDIS_CLUSTER_NODES", "localhost:7000,localhost:7001,localhost:7002")
            .split(",")
            .map((node) => {
              const [host, port] = node.split(":")
              return { host, port: Number.parseInt(port) }
            })

          return {
            store: redisStore,
            cluster: {
              enableReadyCheck: false,
              redisOptions: {
                password: configService.get("REDIS_PASSWORD"),
                connectTimeout: 10000,
                commandTimeout: 5000,
                retryDelayOnFailover: 100,
                enableOfflineQueue: false,
                maxRetriesPerRequest: 3,
              },
              nodes: clusterNodes,
              options: {
                enableReadyCheck: false,
                redisOptions: {
                  password: configService.get("REDIS_PASSWORD"),
                },
                scaleReads: "slave",
                maxRedirections: 16,
                retryDelayOnFailover: 100,
                enableOfflineQueue: false,
                lazyConnect: true,
              },
            },
            ttl: configService.get("CACHE_TTL", 600),
            max: configService.get("CACHE_MAX_ITEMS", 10000),
            // Compression settings
            compress: configService.get("CACHE_COMPRESSION_ENABLED", true),
            compressionThreshold: configService.get("CACHE_COMPRESSION_THRESHOLD", 1024), // 1KB
          }
        } else {
          // Single Redis Instance Configuration
          return {
            store: redisStore,
            host: configService.get("REDIS_HOST", "localhost"),
            port: configService.get("REDIS_PORT", 6379),
            password: configService.get("REDIS_PASSWORD"),
            ttl: configService.get("CACHE_TTL", 600),
            max: configService.get("CACHE_MAX_ITEMS", 10000),
            // Connection pool settings
            family: 4,
            keepAlive: true,
            connectTimeout: 10000,
            commandTimeout: 5000,
            retryDelayOnFailover: 100,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 3,
            // Compression settings
            compress: configService.get("CACHE_COMPRESSION_ENABLED", true),
            compressionThreshold: configService.get("CACHE_COMPRESSION_THRESHOLD", 1024),
          }
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    DatabaseService,
    QueryCacheService,
    DatabaseHealthService,
    RedisClusterService,
    CacheCompressionService,
    CacheAnalyticsService,
    CacheInvalidationService,
  ],
  exports: [
    DatabaseService,
    QueryCacheService,
    DatabaseHealthService,
    RedisClusterService,
    CacheCompressionService,
    CacheAnalyticsService,
    CacheInvalidationService,
  ],
})
export class DatabaseModule {}
