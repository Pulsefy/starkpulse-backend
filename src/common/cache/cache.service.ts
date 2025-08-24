import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../module/redis/redis.service';
import { CacheAnalyticsService } from '../../database/services/cache-analytics.service';
import { CacheInvalidationService } from '../../database/services/cache-invalidation.service';
import { CacheCompressionService } from '../../database/services/cache-compression.service';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  storeLevel?: 'memory' | 'redis' | 'both';
  priority?: 'high' | 'medium' | 'low';
}

export interface CacheStats {
  memoryHits: number;
  redisHits: number;
  misses: number;
  hitRate: number;
  averageResponseTime: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTLs = {
    memory: 60, // 1 minute
    redis: 600, // 10 minutes
  };

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly analytics: CacheAnalyticsService,
    private readonly invalidation: CacheInvalidationService,
    private readonly compression: CacheCompressionService,
  ) {}

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Try memory cache first for high-priority items
      if (options?.priority === 'high' || options?.storeLevel === 'memory') {
        const memoryResult = await this.getFromMemory<T>(key);
        if (memoryResult !== null) {
          this.analytics.recordHit(key);
          this.analytics.recordOperation('memory_get', Date.now() - startTime, true);
          return memoryResult;
        }
      }
      
      // Try Redis cache
      const redisResult = await this.getFromRedis<T>(key, options?.compress);
      if (redisResult !== null) {
        this.analytics.recordHit(key);
        this.analytics.recordOperation('redis_get', Date.now() - startTime, true);
        
        // Promote to memory cache if high priority
        if (options?.priority === 'high') {
          await this.setInMemory(key, redisResult, this.defaultTTLs.memory);
        }
        
        return redisResult;
      }
      
      // Cache miss
      this.analytics.recordMiss(key);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      this.analytics.recordError('cache_get_error', error.message);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const startTime = Date.now();
    
    try {
      const storeLevel = options?.storeLevel || 'both';
      const memoryTTL = options?.ttl || this.defaultTTLs.memory;
      const redisTTL = options?.ttl || this.defaultTTLs.redis;
      
      // Set in memory cache
      if (storeLevel === 'memory' || storeLevel === 'both') {
        await this.setInMemory(key, value, memoryTTL);
      }
      
      // Set in Redis cache
      if (storeLevel === 'redis' || storeLevel === 'both') {
        await this.setInRedis(key, value, redisTTL, options?.compress, options?.tags);
      }
      
      this.analytics.recordOperation('cache_set', Date.now() - startTime, true);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      this.analytics.recordError('cache_set_error', error.message);
    }
  }

  async invalidate(pattern: string): Promise<number> {
    try {
      // Invalidate from both stores
      const redisCount = await this.redisService.deletePattern(pattern);
      
      // For memory cache, we need to clear all since pattern matching is limited
      await this.cacheManager.reset();
      
      this.logger.log(`Invalidated ${redisCount} keys matching pattern: ${pattern}`);
      return redisCount;
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
      this.analytics.recordError('cache_invalidation_error', error.message);
      return 0;
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    return await this.invalidation.invalidateByTag(tags.join(','));
  }

  // Data type specific cache methods with optimized TTLs
  async cacheMarketData<T>(key: string, data: T): Promise<void> {
    await this.set(key, data, {
      ttl: 60, // 1 minute for volatile market data
      tags: ['market-data'],
      priority: 'high',
      storeLevel: 'both',
    });
  }

  async cacheNewsData<T>(key: string, data: T): Promise<void> {
    await this.set(key, data, {
      ttl: 1800, // 30 minutes for news
      tags: ['news'],
      priority: 'medium',
      compress: true,
    });
  }

  async cachePortfolioData<T>(key: string, data: T): Promise<void> {
    await this.set(key, data, {
      ttl: 300, // 5 minutes for portfolio data
      tags: ['portfolio'],
      priority: 'high',
      storeLevel: 'redis', // User-specific data in Redis only
    });
  }

  async cacheAnalyticsData<T>(key: string, data: T): Promise<void> {
    await this.set(key, data, {
      ttl: 3600, // 1 hour for analytics
      tags: ['analytics'],
      priority: 'low',
      compress: true,
    });
  }

  // Statistics and monitoring
  async getStats(): Promise<CacheStats> {
    const analytics = this.analytics.getAnalytics();
    return {
      memoryHits: analytics.metrics.hits, // This would need to be separated by store
      redisHits: analytics.metrics.hits,
      misses: analytics.metrics.misses,
      hitRate: analytics.metrics.hitRate,
      averageResponseTime: analytics.metrics.averageResponseTime,
    };
  }

  // Private helper methods
  private async getFromMemory<T>(key: string): Promise<T | null> {
    return await this.cacheManager.get(key);
  }

  private async getFromRedis<T>(key: string, decompress = false): Promise<T | null> {
    const data = await this.redisService.get(key);
    if (!data) return null;
    
    if (decompress) {
      try {
        const decompressed = await this.compression.decompress(
          Buffer.from(data, 'base64'),
          '' // metadata would be stored separately
        );
        return JSON.parse(decompressed.toString());
      } catch (error) {
        this.logger.warn(`Failed to decompress data for key ${key}`);
        return JSON.parse(data);
      }
    }
    
    return JSON.parse(data);
  }

  private async setInMemory<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl * 1000); // Convert to milliseconds
  }

  private async setInRedis<T>(
    key: string,
    value: T,
    ttl: number,
    compress = false,
    tags?: string[]
  ): Promise<void> {
    let dataToStore = JSON.stringify(value);
    
    if (compress) {
      try {
        const compressed = await this.compression.compressJson(value);
        dataToStore = compressed.compressed.toString('base64');
        this.analytics.recordCompressionRatio(compressed.stats.compressionRatio);
      } catch (error) {
        this.logger.warn(`Compression failed for key ${key}, storing uncompressed`);
      }
    }
    
    await this.redisService.set(key, dataToStore, ttl);
    
    // Tag the key for invalidation
    if (tags && tags.length > 0) {
      this.invalidation.tagKey(key, tags);
    }
  }

  // Legacy methods for backward compatibility
  async invalidateNewsCache(): Promise<void> {
    await this.invalidateByTags(['news']);
  }

  async invalidateMarketCache(): Promise<void> {
    await this.invalidateByTags(['market-data']);
  }

  async invalidateAllCache(): Promise<void> {
    await this.cacheManager.reset();
    await this.redisService.deletePattern('*');
  }

  async invalidateCache(pattern: string): Promise<void> {
    await this.invalidate(pattern);
  }
}