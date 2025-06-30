import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RateLimitStore } from './rate-limit-store.interface';
import {
  RateLimitResult,
  TokenBucketRateLimitConfig,
  UserRateLimitAdjustment,
} from '../interfaces/rate-limit.interface';

interface TokenBucketRecord {
  tokens: number;
  lastRefill: number;
  burstCapacity: number;
}

@Injectable()
export class TokenBucketRateLimitStore implements RateLimitStore {
  private readonly logger = new Logger(TokenBucketRateLimitStore.name);
  private readonly memoryStore = new Map<string, TokenBucketRecord>();
  constructor(@Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache) {}

  private async getRecord(key: string): Promise<TokenBucketRecord | null> {
    if (this.cacheManager) {
      const record = await this.cacheManager.get<TokenBucketRecord>(key);
      return record || null;
    }
    return this.memoryStore.get(key) || null;
  }

  private async setRecord(key: string, record: TokenBucketRecord, ttl: number) {
    if (this.cacheManager) {
      await this.cacheManager.set(key, record, ttl);
    } else {
      this.memoryStore.set(key, record);
    }
  }

  private async delRecord(key: string) {
    if (this.cacheManager) {
      await this.cacheManager.del(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  async hitTokenBucket(
    key: string,
    config: TokenBucketRateLimitConfig,
    userId?: number,
    userAdjustments?: UserRateLimitAdjustment[],
  ): Promise<RateLimitResult> {
    const now = Date.now();
    let capacity = config.capacity;
    let refillRate = config.refillRate;
    let refillIntervalMs = config.refillIntervalMs;
    let burstCapacity = config.burstCapacity ?? config.capacity;
    if (userId && userAdjustments) {
      const adj = userAdjustments.find((a) => a.userId === userId);
      if (adj) {
        if (adj.maxOverride) capacity = adj.maxOverride;
        refillRate = Math.ceil(refillRate * adj.multiplier);
        burstCapacity = Math.ceil(burstCapacity * adj.multiplier);
      }
    }
    const ttl = Math.ceil((burstCapacity / refillRate) * refillIntervalMs / 1000);
    let record = await this.getRecord(key);
    if (!record) {
      record = {
        tokens: capacity,
        lastRefill: now,
        burstCapacity,
      };
    } else {
      const elapsed = now - record.lastRefill;
      if (elapsed > 0) {
        const refillTokens = Math.floor(elapsed / refillIntervalMs) * refillRate;
        record.tokens = Math.min(record.tokens + refillTokens, burstCapacity);
        record.lastRefill = record.lastRefill + Math.floor(elapsed / refillIntervalMs) * refillIntervalMs;
      }
    }
    let allowed = false;
    if (record.tokens > 0) {
      record.tokens--;
      allowed = true;
    }
    await this.setRecord(key, record, ttl);
    return {
      allowed,
      remaining: record.tokens,
      resetTime: new Date(record.lastRefill + refillIntervalMs),
      totalHits: capacity - record.tokens,
      windowStart: new Date(record.lastRefill),
    };
  }

  async getTokenBucket(key: string): Promise<RateLimitResult | null> {
    const record = await this.getRecord(key);
    if (!record) return null;
    return {
      allowed: record.tokens > 0,
      remaining: record.tokens,
      resetTime: new Date(record.lastRefill + record.burstCapacity),
      totalHits: 0,
      windowStart: new Date(record.lastRefill),
    };
  }

  async hit(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    return this.hitTokenBucket(key, {
      capacity: max,
      refillRate: max,
      refillIntervalMs: windowMs,
    });
  }

  async get(key: string): Promise<RateLimitResult | null> {
    return this.getTokenBucket(key);
  }

  async reset(key: string): Promise<void> {
    await this.delRecord(key);
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const record = await this.getRecord(key);
    if (!record) return 0;
    record.tokens = Math.min(record.tokens + 1, record.burstCapacity);
    await this.setRecord(key, record, Math.ceil(windowMs / 1000));
    return record.tokens;
  }
} 