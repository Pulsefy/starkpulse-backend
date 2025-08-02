import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig } from '../interfaces/rate-limit.interface';
import { RateLimitType } from '../enums/rate-limit.enum';
import { RATE_LIMIT_KEY, RateLimitException } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const routeConfig = this.reflector.getAllAndOverride<Partial<RateLimitConfig>>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!routeConfig) {
      return true; 
    }

    if (routeConfig.skipIf?.(request)) {
      return true;
    }

    const defaultConfig = this.configService.get<RateLimitConfig>('rateLimit.default') ?? { windowMs: 60000, max: 100 };
    const config: RateLimitConfig = {
      ...defaultConfig,
      ...routeConfig,
      windowMs: routeConfig.windowMs ?? defaultConfig.windowMs ?? 60000,
      max: routeConfig.max ?? defaultConfig.max ?? 100,
    };

    const userId = request.user?.id;
    const userRoles = request.user?.roles;
    const ipAddress = this.getClientIp(request);
    const endpoint = `${request.method}:${request.route?.path || request.path}`;

    const keyType = this.determineKeyType(config, userId, ipAddress);
    const key = this.rateLimitService.generateKey(keyType, userId, ipAddress, endpoint);

    try {
      const result = await this.rateLimitService.checkRateLimit(
        key,
        config,
        userId,
        userRoles,
        ipAddress,
      );

      this.addRateLimitHeaders(response, result, config);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
        
        this.logger.warn(
          `Rate limit exceeded in guard for ${userId ? `user ${userId}` : `IP ${ipAddress}`} ` +
          `on ${endpoint}. Key: ${key}`
        );

        throw new RateLimitException(
          typeof config.message === 'string' ? config.message : 'Rate limit exceeded',
          retryAfter,
          config.max,
          result.remaining,
          result.resetTime,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof RateLimitException) {
        throw error;
      }

      this.logger.error('Rate limit guard error:', error);
      return true;
    }
  }

  private determineKeyType(config: RateLimitConfig, userId?: number, ipAddress?: string): RateLimitType {
    if (config.keyGenerator) {
      return RateLimitType.COMBINED; 
    }

    if (userId && ipAddress) {
      return RateLimitType.COMBINED;
    } else if (userId) {
      return RateLimitType.PER_USER;
    } else if (ipAddress) {
      return RateLimitType.PER_IP;
    } else {
      return RateLimitType.GLOBAL;
    }
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private addRateLimitHeaders(response: any, result: any, config: RateLimitConfig): void {
    if (config.headers !== false) {
      response.setHeader('X-RateLimit-Limit', config.max.toString());
      response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime.getTime() / 1000).toString());
      response.setHeader('X-RateLimit-Used', result.totalHits.toString());

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
        response.setHeader('Retry-After', retryAfter.toString());
      }
    }
  }
}
