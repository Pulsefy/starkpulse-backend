import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

@Injectable()
export class QueryCacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private generateCacheKey(query: string, parameters?: any[]): string {
    const content = query + JSON.stringify(parameters || []);
    return `query:${createHash('md5').update(content).digest('hex')}`;
  }

  async get<T>(query: string, parameters?: any[]): Promise<T | null> {
    const key = this.generateCacheKey(query, parameters);
    return await this.cacheManager.get(key);
  }

  async set<T>(
    query: string,
    data: T,
    ttl?: number,
    parameters?: any[],
  ): Promise<void> {
    const key = this.generateCacheKey(query, parameters);
    await this.cacheManager.set(key, data, ttl);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // For memory cache, we need to iterate through keys differently
      const store = (this.cacheManager as any).store;
      if (store && typeof store.keys === 'function') {
        const keys = await store.keys(`query:*${pattern}*`);
        if (keys.length > 0) {
          await Promise.all(
            keys.map((key: string) => this.cacheManager.del(key)),
          );
        }
      } else {
        // Fallback for stores that don't support pattern matching
        console.warn('Cache store does not support pattern-based invalidation');
      }
    } catch (error) {
      console.error('Error invalidating cache pattern:', error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidatePattern(tag);
    }
  }
}
