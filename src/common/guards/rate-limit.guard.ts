import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';

interface RateLimitOptions {
  points: number; // Number of requests
  duration: number; // Time window in seconds
  errorMessage?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit';

// Decorator to apply rate limiting to controllers or routes
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      handler,
    );

    if (!options) {
      return true; // No rate limiting applied
    }

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || 'unknown';
    const endpoint = request.path;
    const key = `${ip}:${endpoint}`;

    const now = Date.now();
    const record = this.store.get(key) || {
      count: 0,
      resetTime: now + options.duration * 1000,
    };

    // Reset counter if the time window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + options.duration * 1000;
    }

    // Increment request count
    record.count += 1;
    this.store.set(key, record);

    // Check if rate limit exceeded
    if (record.count > options.points) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000);
      this.logger.warn(
        `Rate limit exceeded for ${key}. Requests: ${record.count}, Limit: ${options.points}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            options.errorMessage ||
            'Too many requests, please try again later.',
          waitTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
