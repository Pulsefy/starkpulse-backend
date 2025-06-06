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
    // Implementation depends on your cache store
    // For Redis, you might use SCAN and DEL commands
    const keys = await this.cacheManager.store.keys(`query:*${pattern}*`);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.cacheManager.del(key)));
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidatePattern(tag);
    }
  }
}
