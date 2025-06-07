import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitStore } from '../stores/rate-limit-store.interface';
import { 
  RateLimitConfig, 
  RateLimitResult, 
  AdaptiveRateLimitConfig,
  TrustedUserConfig 
} from '../interfaces/rate-limit.interface';
import { RateLimitType, RateLimitStrategy } from '../enums/rate-limit.enum';
import { SystemHealthService } from './system-health.service';
import { TrustedUserService } from './trusted-user.service';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private adaptiveConfig: AdaptiveRateLimitConfig;
  private currentAdaptiveMultiplier = 1;

  constructor(
    private readonly rateLimitStore: RateLimitStore,
    private readonly configService: ConfigService,
    private readonly systemHealthService: SystemHealthService,
    private readonly trustedUserService: TrustedUserService,
  ) {
    this.adaptiveConfig = this.configService.get<AdaptiveRateLimitConfig>('rateLimit.adaptive');
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
      const isTrusted = await this.trustedUserService.isTrustedUser(userId, userRoles, ipAddress);
      
      let effectiveLimit = config.max;
      
      if (isTrusted) {
        const trustedConfig = this.configService.get<TrustedUserConfig>('rateLimit.trusted');
        effectiveLimit = Math.floor(config.max * trustedConfig.bypassFactor);
        this.logger.debug(`Trusted user ${userId}, increased limit to ${effectiveLimit}`);
      }

      if (this.adaptiveConfig) {
        effectiveLimit = Math.floor(effectiveLimit * this.currentAdaptiveMultiplier);
      }

      const result = await this.rateLimitStore.hit(key, config.windowMs, effectiveLimit);

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
      await this.rateLimitStore.reset(key);
      this.logger.log(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for key ${key}:`, error);
    }
  }

  async getRateLimitStatus(key: string): Promise<RateLimitResult | null> {
    try {
      return await this.rateLimitStore.get(key);
    } catch (error) {
      this.logger.error(`Failed to get rate limit status for key ${key}:`, error);
      return null;
    }
  }

  private startAdaptiveMonitoring(): void {
    if (!this.adaptiveConfig) return;

    setInterval(async () => {
      try {
        const health = await this.systemHealthService.getSystemHealth();
        
        if (health.cpuUsage > this.adaptiveConfig.increaseThreshold || 
            health.memoryUsage > this.adaptiveConfig.increaseThreshold) {
          // System under stress, decrease limits
          this.currentAdaptiveMultiplier = Math.max(
            this.adaptiveConfig.minLimit / this.adaptiveConfig.baseLimit,
            this.currentAdaptiveMultiplier - this.adaptiveConfig.adjustmentFactor,
          );
          this.logger.warn(
            `System under stress (CPU: ${health.cpuUsage}%, Memory: ${health.memoryUsage}%), ` +
            `decreasing rate limits by factor: ${this.currentAdaptiveMultiplier}`,
          );
        } else if (health.cpuUsage < this.adaptiveConfig.decreaseThreshold && 
                   health.memoryUsage < this.adaptiveConfig.decreaseThreshold) {
          this.currentAdaptiveMultiplier = Math.min(
            this.adaptiveConfig.maxLimit / this.adaptiveConfig.baseLimit,
            this.currentAdaptiveMultiplier + this.adaptiveConfig.adjustmentFactor,
          );
          this.logger.debug(
            `System healthy, increasing rate limits by factor: ${this.currentAdaptiveMultiplier}`,
          );
        }
      } catch (error) {
        this.logger.error('Failed to check system health for adaptive rate limiting:', error);
      }
    }, 30000);
  }
}
