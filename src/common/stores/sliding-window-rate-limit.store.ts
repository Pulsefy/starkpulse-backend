import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RateLimitStore } from './rate-limit-store.interface';
import { RateLimitResult } from '../interfaces/rate-limit.interface';

@Injectable()
export class SlidingWindowRateLimitStore implements RateLimitStore {
  private readonly logger = new Logger(SlidingWindowRateLimitStore.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async hit(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    try {
      const timestamps = await this.cacheManager.get<number[]>(key) || [];
      
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      
      validTimestamps.push(now);
      
      await this.cacheManager.set(key, validTimestamps, Math.ceil(windowMs / 1000));
      
      const totalHits = validTimestamps.length;
      const remaining = Math.max(0, max - totalHits);
      const allowed = totalHits <= max;
      
      const oldestTimestamp = Math.min(...validTimestamps);
      const resetTime = new Date(oldestTimestamp + windowMs);

      return {
        allowed,
        remaining,
        resetTime,
        totalHits,
        windowStart: new Date(windowStart),
      };
    } catch (error) {
      this.logger.error(`Sliding window rate limit error for key ${key}:`, error);
      return {
        allowed: true,
        remaining: max - 1,
        resetTime: new Date(now + windowMs),
        totalHits: 1,
        windowStart: new Date(windowStart),
      };
    }
  }

  async get(key: string): Promise<RateLimitResult | null> {
    try {
      const timestamps = await this.cacheManager.get<number[]>(key);
      if (!timestamps || timestamps.length === 0) return null;

      const now = Date.now();
      const windowMs = 60000; // Should be configurable
      const windowStart = now - windowMs;
      const validTimestamps = timestamps.filter(ts => ts > windowStart);

      if (validTimestamps.length === 0) return null;

      const oldestTimestamp = Math.min(...validTimestamps);
      const resetTime = new Date(oldestTimestamp + windowMs);

      return {
        allowed: true,
        remaining: 0,
        resetTime,
        totalHits: validTimestamps.length,
        windowStart: new Date(windowStart),
      };
    } catch (error) {
      this.logger.error(`Sliding window get error for key ${key}:`, error);
      return null;
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Sliding window reset error for key ${key}:`, error);
    }
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const result = await this.hit(key, windowMs, Number.MAX_SAFE_INTEGER);
    return result.totalHits;
  }
}