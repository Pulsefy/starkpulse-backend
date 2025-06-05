import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';

export const RATE_LIMIT_KEY = 'rate-limit';

export const RateLimit = (config: Partial<RateLimitConfig>) =>
  SetMetadata(RATE_LIMIT_KEY, config);
export const StrictRateLimit = (max: number = 10, windowMs: number = 60000) =>
  RateLimit({ max, windowMs });

export const StandardRateLimit = (max: number = 100, windowMs: number = 60000) =>
  RateLimit({ max, windowMs });

export const RelaxedRateLimit = (max: number = 1000, windowMs: number = 60000) =>
  RateLimit({ max, windowMs });

export const NoRateLimit = () =>
  RateLimit({ skipIf: () => true });

import { HttpException, HttpStatus } from '@nestjs/common';

export class RateLimitException extends HttpException {
  constructor(
    message: string = 'Too many requests',
    public readonly retryAfter: number,
    public readonly limit: number,
    public readonly remaining: number,
    public readonly resetTime: Date,
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        error: 'Too Many Requests',
        retryAfter,
        limit,
        remaining,
        resetTime: resetTime.toISOString(),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}