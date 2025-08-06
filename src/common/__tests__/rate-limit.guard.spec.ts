import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitException } from '../interceptors/rate-limit-logging.interceptor';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rateLimitService: RateLimitService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn(),
            generateKey: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              windowMs: 60000,
              max: 100,
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow request when no rate limit config', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    const context = createMockExecutionContext({});
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should allow request within rate limit', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ max: 100, windowMs: 60000 });
    jest.spyOn(rateLimitService, 'generateKey').mockReturnValue('test-key');
    jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetTime: new Date(),
      totalHits: 1,
      windowStart: new Date(),
    });

    const context = createMockExecutionContext({
      user: { id: 1 },
      headers: {},
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should throw exception when rate limit exceeded', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ max: 100, windowMs: 60000 });
    jest.spyOn(rateLimitService, 'generateKey').mockReturnValue('test-key');
    jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: new Date(Date.now() + 60000),
      totalHits: 101,
      windowStart: new Date(),
    });

    const context = createMockExecutionContext({
      user: { id: 1 },
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(RateLimitException);
  });

  function createMockExecutionContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({
          setHeader: jest.fn(),
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as any;
  }
});
