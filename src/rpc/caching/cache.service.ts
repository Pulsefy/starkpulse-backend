import { Injectable } from '@nestjs/common';
import NodeCache from 'node-cache';

@Injectable()
export class CacheService {
  private readonly cache = new NodeCache({ stdTTL: 60 }); // 1 minute default TTL

  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    this.cache.set(key, value, ttlSeconds ?? 60); // Default to 60 seconds if ttlSeconds is undefined
  }

  del(key: string): void {
    this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }
}
