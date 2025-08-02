import { Injectable } from '@nestjs/common';
import { RedisService } from '../module/redis/redis.service';

@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  // Cache invalidation methods
  async invalidateNewsCache(): Promise<void> {
    await this.redisService.deletePattern('api:/api/news*');
  }

  async invalidateMarketCache(): Promise<void> {
    await this.redisService.deletePattern('api:/api/market*');
  }

  // Method to invalidate all API cache
  async invalidateAllCache(): Promise<void> {
    await this.redisService.deletePattern('api:*');
  }

  // Method to invalidate specific cache keys
  async invalidateCache(pattern: string): Promise<void> {
    await this.redisService.deletePattern(pattern);
  }
}
