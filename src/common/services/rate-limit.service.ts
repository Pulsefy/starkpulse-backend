import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryRateLimitStore } from '../stores/memory-rate-limit.store';
import {
  RateLimitConfig,
  RateLimitResult,
  AdaptiveRateLimitConfig,
  TrustedUserConfig,
} from '../interfaces/rate-limit.interface';
import { RateLimitType, RateLimitStrategy } from '../enums/rate-limit.enum';
import { TrustedUserService } from './trusted-user.service';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly adaptiveConfig: AdaptiveRateLimitConfig;
  private currentAdaptiveMultiplier = 1.0;
  private readonly adaptiveMonitoringInterval = 30000;

  constructor(
    private readonly configService: ConfigService,
    private readonly trustedUserService: TrustedUserService,
    private readonly store: MemoryRateLimitStore,
  ) {
    this.adaptiveConfig = this.configService.get<AdaptiveRateLimitConfig>(
      'rateLimit.adaptive',
    ) || {
      enabled: false,
      baseLimit: 100,
      maxLimit: 1000,
      minLimit: 10,
      increaseThreshold: 0.8,
      decreaseThreshold: 0.2,
      adjustmentFactor: 0.1,
      cpuThreshold: 80,
      memoryThreshold: 85,
      responseTimeThreshold: 1000,
      minMultiplier: 0.1,
      maxMultiplier: 2.0,
    };
    this.startAdaptiveMonitoring();
  }

  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    userId?: number,
    userRoles?: string[],
    ipAddress?: string,
  ): Promise<RateLimitResult> {
    try {
      const isTrusted = await this.trustedUserService.isTrustedUser(
        userId,
        userRoles,
        ipAddress,
      );

      let effectiveLimit = config.max;

      if (isTrusted) {
        const trustedConfig = this.configService.get<TrustedUserConfig>(
          'rateLimit.trusted',
        ) || {
          bypassFactor: 2.0,
        };
        effectiveLimit = Math.floor(config.max * trustedConfig.bypassFactor);
        this.logger.debug(
          `Trusted user ${userId}, increased limit to ${effectiveLimit}`,
        );
      }

      if (this.adaptiveConfig?.enabled) {
        effectiveLimit = Math.floor(
          effectiveLimit * this.getCurrentMultiplier(),
        );
      }

      const result = await this.store.hit(key, config.windowMs, effectiveLimit);

      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded for key: ${key}, limit: ${effectiveLimit}, ` +
            `hits: ${result.totalHits}, remaining: ${result.remaining}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Rate limit check failed for key ${key}:`, error);
      return {
        allowed: true,
        remaining: config.max - 1,
        resetTime: new Date(Date.now() + config.windowMs),
        totalHits: 1,
        windowStart: new Date(),
      };
    }
  }

  generateKey(
    type: RateLimitType,
    userId?: number,
    ipAddress?: string,
    endpoint?: string,
  ): string {
    switch (type) {
      case RateLimitType.GLOBAL:
        return 'global';
      case RateLimitType.PER_USER:
        return `user:${userId || 'anonymous'}`;
      case RateLimitType.PER_IP:
        return `ip:${ipAddress || 'unknown'}`;
      case RateLimitType.PER_ENDPOINT:
        return `endpoint:${endpoint || 'unknown'}`;
      case RateLimitType.COMBINED:
        return `combined:${userId || 'anon'}:${ipAddress || 'unknown'}:${endpoint || 'unknown'}`;
      default:
        return `default:${userId || ipAddress || 'unknown'}`;
    }
  }

  async resetRateLimit(key: string): Promise<void> {
    try {
      await this.store.reset(key);
      this.logger.log(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for key ${key}:`, error);
    }
  }

  async getRateLimitStatus(key: string): Promise<RateLimitResult | null> {
    try {
      return await this.store.get(key);
    } catch (error) {
      this.logger.error(
        `Failed to get rate limit status for key ${key}:`,
        error,
      );
      return null;
    }
  }

  private getCurrentMultiplier(): number {
    return this.currentAdaptiveMultiplier;
  }

  private startAdaptiveMonitoring(): void {
    if (!this.adaptiveConfig?.enabled) return;

    setInterval(async () => {
      try {
        // Simple system health check without external dependency
        const memUsage = process.memoryUsage();
        const memoryUsagePercent =
          (memUsage.heapUsed / memUsage.heapTotal) * 100;

        if (memoryUsagePercent > this.adaptiveConfig.increaseThreshold * 100) {
          // System under stress, decrease limits
          this.currentAdaptiveMultiplier = Math.max(
            this.adaptiveConfig.minMultiplier,
            this.currentAdaptiveMultiplier -
              this.adaptiveConfig.adjustmentFactor,
          );
        } else if (
          memoryUsagePercent <
          this.adaptiveConfig.decreaseThreshold * 100
        ) {
          // System healthy, increase limits
          this.currentAdaptiveMultiplier = Math.min(
            this.adaptiveConfig.maxMultiplier,
            this.currentAdaptiveMultiplier +
              this.adaptiveConfig.adjustmentFactor,
          );
        }
      } catch (error) {
        this.logger.error('Adaptive monitoring error:', error);
      }
    }, this.adaptiveMonitoringInterval);
  }
}
