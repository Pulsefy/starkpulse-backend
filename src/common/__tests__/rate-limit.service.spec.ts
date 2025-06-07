import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from '../services/rate-limit.service';
import { SystemHealthService } from '../services/system-health.service';
import { TrustedUserService } from '../services/trusted-user.service';
import { MemoryRateLimitStore } from '../stores/memory-rate-limit.store';
import { RateLimitType } from '../enums/rate-limit.enum';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let rateLimitStore: MemoryRateLimitStore;
  let trustedUserService: TrustedUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: MemoryRateLimitStore,
          useValue: {
            hit: jest.fn(),
            get: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              adaptive: null,
              trusted: { bypassFactor: 10 },
            }),
          },
        },
        {
          provide: SystemHealthService,
          useValue: {
            getSystemHealth: jest.fn(),
          },
        },
        {
          provide: TrustedUserService,
          useValue: {
            isTrustedUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    rateLimitStore = module.get<MemoryRateLimitStore>(MemoryRateLimitStore);
    trustedUserService = module.get<TrustedUserService>(TrustedUserService);
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

      jest.spyOn(rateLimitStore, 'hit').mockResolvedValue(mockResult);
      jest.spyOn(trustedUserService, 'isTrustedUser').mockResolvedValue(false);

      const result = await service.checkRateLimit(
        'test-key',
        { windowMs: 60000, max: 100 },
        1,
        ['user'],
        '192.168.1.1',
      );

      expect(result).toEqual(mockResult);
      expect(rateLimitStore.hit).toHaveBeenCalledWith('test-key', 60000, 100);
    });

    it('should increase limit for trusted users', async () => {
      const mockResult = {
        allowed: true,
        remaining: 999,
        resetTime: new Date(),
        totalHits: 1,
        windowStart: new Date(),
      };

      jest.spyOn(rateLimitStore, 'hit').mockResolvedValue(mockResult);
      jest.spyOn(trustedUserService, 'isTrustedUser').mockResolvedValue(true);

      const result = await service.checkRateLimit(
        'test-key',
        { windowMs: 60000, max: 100 },
        1,
        ['admin'],
        '192.168.1.1',
      );

      expect(result).toEqual(mockResult);
      // Should be called with increased limit (100 * 10 = 1000)
      expect(rateLimitStore.hit).toHaveBeenCalledWith('test-key', 60000, 1000);
    });

    it('should handle store errors gracefully', async () => {
      jest.spyOn(rateLimitStore, 'hit').mockRejectedValue(new Error('Store error'));
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
});
