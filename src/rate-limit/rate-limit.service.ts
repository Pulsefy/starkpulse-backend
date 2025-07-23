// src/rate-limit/rate-limit.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class RateLimitService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private readonly limits = {
    free: { limit: 100, window: 60 },        // 100 req per 60 seconds
    pro: { limit: 1000, window: 60 },
    enterprise: { limit: 10000, window: 60 },
  };

  async checkLimit(tier: string, userId: number) {
    const { limit, window } = this.limits[tier];
    const key = `rate:${userId}:${tier}`;

    const currentCount = await this.redis.incr(key);

    if (currentCount === 1) {
      // First request, set expiry
      await this.redis.expire(key, window);
    }

    if (currentCount > limit) {
      throw new BadRequestException(`Rate limit exceeded. Try again in ${await this.redis.ttl(key)}s.`);
    }
  }
}