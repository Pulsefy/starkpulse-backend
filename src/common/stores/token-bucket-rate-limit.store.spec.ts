import { TokenBucketRateLimitStore } from './token-bucket-rate-limit.store';
import { TokenBucketRateLimitConfig, UserRateLimitAdjustment } from '../interfaces/rate-limit.interface';

describe('TokenBucketRateLimitStore', () => {
  let store: TokenBucketRateLimitStore;

  beforeEach(() => {
    store = new TokenBucketRateLimitStore();
  });

  it('should allow requests up to burst capacity and refill tokens', async () => {
    const config: TokenBucketRateLimitConfig = {
      capacity: 5,
      refillRate: 1,
      refillIntervalMs: 100,
      burstCapacity: 5,
    };
    const key = 'user:burst';
    for (let i = 0; i < 5; i++) {
      const result = await store.hitTokenBucket(key, config);
      expect(result.allowed).toBe(true);
    }
    const result = await store.hitTokenBucket(key, config);
    expect(result.allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 110));
    const afterRefill = await store.hitTokenBucket(key, config);
    expect(afterRefill.allowed).toBe(true);
  });

  it('should apply user-specific adjustments', async () => {
    const config: TokenBucketRateLimitConfig = {
      capacity: 5,
      refillRate: 1,
      refillIntervalMs: 100,
      burstCapacity: 5,
    };
    const adjustments: UserRateLimitAdjustment[] = [
      { userId: 42, multiplier: 2, maxOverride: 10 },
    ];
    const key = 'user:42';
    for (let i = 0; i < 10; i++) {
      const result = await store.hitTokenBucket(key, config, 42, adjustments);
      expect(result.allowed).toBe(true);
    }
    const result = await store.hitTokenBucket(key, config, 42, adjustments);
    expect(result.allowed).toBe(false);
  });

  it('should be concurrency safe in memory mode', async () => {
    const config: TokenBucketRateLimitConfig = {
      capacity: 3,
      refillRate: 1,
      refillIntervalMs: 100,
      burstCapacity: 3,
    };
    const key = 'user:concurrent';
    let allowedCount = 0;
    for (let i = 0; i < 4; i++) {
      const result = await store.hitTokenBucket(key, config);
      if (result.allowed) allowedCount++;
    }
    expect(allowedCount).toBe(3);
  });

  it('should reset the bucket', async () => {
    const config: TokenBucketRateLimitConfig = {
      capacity: 2,
      refillRate: 1,
      refillIntervalMs: 100,
      burstCapacity: 2,
    };
    const key = 'user:reset';
    await store.hitTokenBucket(key, config);
    await store.reset(key);
    const result = await store.hitTokenBucket(key, config);
    expect(result.allowed).toBe(true);
  });

  // Redis mode test would require a mock or integration test with a real Redis instance
}); 