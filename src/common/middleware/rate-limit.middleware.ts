import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig, RateLimitHeaders } from '../interfaces/rate-limit.interface';
import { RateLimitException } from '../exceptions/rate-limit.exception';
import { RateLimitType } from '../enums/rate-limit.enum';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    roles?: string[];
    [key: string]: any;
  };
  rateLimit?: {
    key: string;
    config: RateLimitConfig;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly defaultConfig: RateLimitConfig;

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.defaultConfig = this.configService.get<RateLimitConfig>('rateLimit.default');
  }

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const routeConfig = this.getRouteRateLimitConfig(req);
      
      if (routeConfig?.skipIf?.(req)) {
        return next();
      }

      const config = { ...this.defaultConfig, ...routeConfig };
      const userId = req.user?.id;
      const userRoles = req.user?.roles;
      const ipAddress = this.getClientIp(req);
      const endpoint = `${req.method}:${req.route?.path || req.path}`;

      const key = this.rateLimitService.generateKey(
        RateLimitType.COMBINED,
        userId,
        ipAddress,
        endpoint,
      );

      req.rateLimit = { key, config };

      const result = await this.rateLimitService.checkRateLimit(
        key,
        config,
        userId,
        userRoles,
        ipAddress,
      );

      this.addRateLimitHeaders(res, result, config);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
        
        this.logger.warn(
          `Rate limit exceeded for ${userId ? `user ${userId}` : `IP ${ipAddress}`} ` +
          `on ${endpoint}. Key: ${key}, Hits: ${result.totalHits}, Limit: ${config.max}`
        );

        throw new RateLimitException(
          config.message || 'Too many requests, please try again later.',
          retryAfter,
          config.max,
          result.remaining,
          result.resetTime,
        );
      }

      this.logger.debug(
        `Rate limit check passed for ${userId ? `user ${userId}` : `IP ${ipAddress}`} ` +
        `on ${endpoint}. Remaining: ${result.remaining}/${config.max}`
      );

      next();
    } catch (error) {
      if (error instanceof RateLimitException) {
        res.setHeader('Retry-After', error.retryAfter);
        return res.status(429).json({
          statusCode: 429,
          message: error.message,
          error: 'Too Many Requests',
          retryAfter: error.retryAfter,
          limit: error.limit,
          remaining: error.remaining,
          resetTime: error.resetTime,
        });
      }

      this.logger.error('Rate limiting middleware error:', error);
      next(error);
    }
  }

  private getRouteRateLimitConfig(req: AuthenticatedRequest): Partial<RateLimitConfig> | null {
    return null;
  }

  private getClientIp(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private addRateLimitHeaders(res: Response, result: any, config: RateLimitConfig): void {
    if (config.headers !== false) {
      const headers: RateLimitHeaders = {
        'X-RateLimit-Limit': config.max.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString(),
        'X-RateLimit-Used': result.totalHits.toString(),
      };

      if (!result.allowed) {
        headers['Retry-After'] = Math.ceil(
          (result.resetTime.getTime() - Date.now()) / 1000
        ).toString();
      }

      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      });
    }
  }
}