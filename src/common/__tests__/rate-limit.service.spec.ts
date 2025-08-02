import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from '../services/rate-limit.service';
import { SystemHealthService } from '../services/system-health.service';
import { TrustedUserService } from '../services/trusted-user.service';
import { MemoryRateLimitStore } from '../stores/memory-rate-limit.store';
import { RateLimitType } from '../enums/rate-limit.enum';
import { TokenBucketRateLimitConfig, UserRateLimitAdjustment } from '../interfaces/rate-limit.interface';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let trustedUserService: any;
  let configService: any;
  let store: any;

  beforeEach(() => {
    trustedUserService = { isTrustedUser: jest.fn().mockResolvedValue(false) };
    configService = { get: jest.fn().mockReturnValue(undefined) };
    store = {
      hit: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 1,
        resetTime: new Date(),
        totalHits: 1,
        windowStart: new Date(),
      }),
      get: jest.fn().mockResolvedValue(null),
      reset: jest.fn().mockResolvedValue(undefined),
      increment: jest.fn().mockResolvedValue(1),
    };
    service = new RateLimitService(configService, trustedUserService, store);
  });

  describe('checkRateLimit', () => {
    it('should allow request within rate limit', async () => {
      const mockResult = {
        allowed: true,
        remaining: 99,
        resetTime: new Date(),
        totalHits: 1,
        windowStart: new Date(),
      };

      jest.spyOn(store, 'hit').mockResolvedValue(mockResult);
      jest.spyOn(trustedUserService, 'isTrustedUser').mockResolvedValue(false);

      const result = await service.checkRateLimit(
        'test-key',
        { windowMs: 60000, max: 100 },
        1,
        ['user'],
        '192.168.1.1',
      );

      expect(result).toEqual(mockResult);
      expect(store.hit).toHaveBeenCalledWith('test-key', 60000, 100);
    });

    it('should increase limit for trusted users', async () => {
      const mockResult = {
        allowed: true,
        remaining: 999,
        resetTime: new Date(),
        totalHits: 1,
        windowStart: new Date(),
      };

      configService.get = jest.fn().mockImplementation((key) => {
        if (key === 'rateLimit.trusted') return { bypassFactor: 2.0 };
        return undefined;
      });
      jest.spyOn(store, 'hit').mockResolvedValue(mockResult);
      jest.spyOn(trustedUserService, 'isTrustedUser').mockResolvedValue(true);

      const result = await service.checkRateLimit('test-key', { windowMs: 60000, max: 100 });
      expect(result).toEqual(mockResult);
      // Should be called with increased limit (100 * 2 = 200)
      expect(store.hit).toHaveBeenCalledWith('test-key', 60000, 200);
    });

    it('should handle store errors gracefully', async () => {
      jest.spyOn(store, 'hit').mockRejectedValue(new Error('Store error'));
      jest.spyOn(trustedUserService, 'isTrustedUser').mockResolvedValue(false);

      const result = await service.checkRateLimit(
        'test-key',
        { windowMs: 60000, max: 100 },
      );

      expect(result.allowed).toBe(true); // Should fail open
    });
  });

  describe('generateKey', () => {
    it('should generate correct keys for different types', () => {
      expect(service.generateKey(RateLimitType.GLOBAL)).toBe('global');
      expect(service.generateKey(RateLimitType.PER_USER, 123)).toBe('user:123');
      expect(service.generateKey(RateLimitType.PER_IP, undefined, '192.168.1.1')).toBe('ip:192.168.1.1');
      expect(service.generateKey(RateLimitType.PER_ENDPOINT, undefined, undefined, '/api/test')).toBe('endpoint:/api/test');
      expect(service.generateKey(RateLimitType.COMBINED, 123, '192.168.1.1', '/api/test')).toBe('combined:123:192.168.1.1:/api/test');
    });
  });

  describe('RateLimitService (TokenBucket)', () => {
    let trustedUserService: any;
    let configService: any;
    let store: any;

    beforeEach(() => {
      trustedUserService = { isTrustedUser: jest.fn().mockResolvedValue(false) };
      configService = { get: jest.fn().mockReturnValue(undefined) };
      const TokenBucketRateLimitStore = require('../stores/token-bucket-rate-limit.store').TokenBucketRateLimitStore;
      store = new TokenBucketRateLimitStore();
      service = new RateLimitService(configService, trustedUserService, store);
    });

    it('should enforce token bucket burst and refill', async () => {
      const config: any = {
        tokenBucket: {
          capacity: 3,
          refillRate: 1,
          refillIntervalMs: 100,
          burstCapacity: 3,
        } as TokenBucketRateLimitConfig,
      };
      const key = 'user:tb:burst';
      for (let i = 0; i < 3; i++) {
        const result = await service.checkRateLimit(key, config);
        expect(result.allowed).toBe(true);
      }
      const result = await service.checkRateLimit(key, config);
      expect(result.allowed).toBe(false);
      await new Promise((r) => setTimeout(r, 110));
      const afterRefill = await service.checkRateLimit(key, config);
      expect(afterRefill.allowed).toBe(true);
    });

    it('should apply user-specific adjustments in token bucket', async () => {
      const config: any = {
        tokenBucket: {
          capacity: 2,
          refillRate: 1,
          refillIntervalMs: 100,
          burstCapacity: 2,
        } as TokenBucketRateLimitConfig,
        userAdjustments: [
          { userId: 99, multiplier: 2, maxOverride: 4 } as UserRateLimitAdjustment,
        ],
      };
      const key = 'user:tb:adj';
      for (let i = 0; i < 4; i++) {
        const result = await service.checkRateLimit(key, config, 99);
        expect(result.allowed).toBe(true);
      }
      const result = await service.checkRateLimit(key, config, 99);
      expect(result.allowed).toBe(false);
    });
  });
});
