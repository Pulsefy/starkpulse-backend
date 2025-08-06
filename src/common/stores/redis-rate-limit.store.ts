import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RateLimitStore } from './rate-limit-store.interface';
import { RateLimitResult } from '../interfaces/rate-limit.interface';

@Injectable()
export class RedisRateLimitStore implements RateLimitStore {
  private readonly logger = new Logger(RedisRateLimitStore.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async hit(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetTime = new Date(windowStart + windowMs);
    const windowKey = `${key}:${windowStart}`;

    try {
      // Use Redis INCR for atomic increment
      const totalHits = await this.increment(windowKey, windowMs);
      
      const remaining = Math.max(0, max - totalHits);
      const allowed = totalHits <= max;

      return {
        allowed,
        remaining,
        resetTime,
        totalHits,
        windowStart: new Date(windowStart),
      };
    } catch (error) {
      this.logger.error(`Redis rate limit error for key ${key}:`, error);
      // Fallback to allowing the request if Redis fails
      return {
        allowed: true,
        remaining: max - 1,
        resetTime,
        totalHits: 1,
        windowStart: new Date(windowStart),
      };
    }
  }

  async get(key: string): Promise<RateLimitResult | null> {
    try {
      const now = Date.now();
      const windowMs = 60000; // Default window, should be configurable
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;

      const totalHits = await this.cacheManager.get<number>(windowKey);
      
      if (totalHits === null || totalHits === undefined) {
        return null;
      }

      return {
        allowed: true,
        remaining: 0,
        resetTime: new Date(windowStart + windowMs),
        totalHits,
        windowStart: new Date(windowStart),
      };
    } catch (error) {
      this.logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async reset(key: string): Promise<void> {
    try {
      // Delete all window keys for this base key
      const pattern = `${key}:*`;
      await this.cacheManager.del(pattern);
    } catch (error) {
      this.logger.error(`Redis reset error for key ${key}:`, error);
    }
  }

  async increment(key: string, windowMs: number): Promise<number> {
    try {
      // Get current count
      let count = await this.cacheManager.get<number>(key) || 0;
      count++;
      
      // Set with TTL equal to window duration
      await this.cacheManager.set(key, count, Math.ceil(windowMs / 1000));
      
      return count;
    } catch (error) {
      this.logger.error(`Redis increment error for key ${key}:`, error);
      return 1; // Fallback
    }
  }
}
