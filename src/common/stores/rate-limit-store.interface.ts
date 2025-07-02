import { RateLimitResult } from '../interfaces/rate-limit.interface';

export interface RateLimitStore {
  hit(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
  get(key: string): Promise<RateLimitResult | null>;
  reset(key: string): Promise<void>;
  increment(key: string, windowMs: number): Promise<number>;
}

export interface TokenBucketRateLimitStore extends RateLimitStore {
  hitTokenBucket(
    key: string,
    config: import('../interfaces/rate-limit.interface').TokenBucketRateLimitConfig,
    userId?: number,
    userAdjustments?: import('../interfaces/rate-limit.interface').UserRateLimitAdjustment[],
  ): Promise<import('../interfaces/rate-limit.interface').RateLimitResult>;
  getTokenBucket(
    key: string,
  ): Promise<import('../interfaces/rate-limit.interface').RateLimitResult | null>;
}
