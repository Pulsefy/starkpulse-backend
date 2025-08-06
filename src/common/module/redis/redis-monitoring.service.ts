import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class CacheMonitorService {
  private readonly HITS_KEY = 'cache:stats:hits';
  private readonly MISS_KEY = 'cache:stats:misses';
  private readonly LATENCY_KEY = 'cache:stats:latency';

  constructor(private readonly redisService: RedisService) {}

  async recordHit(keyType: string): Promise<void> {
    await this.redisService.hincrby(this.HITS_KEY, keyType, 1);
  }

  async recordMiss(keyType: string): Promise<void> {
    await this.redisService.hincrby(this.MISS_KEY, keyType, 1);
  }

  async recordLatency(keyType: string, latencyMs: number): Promise<void> {
    // Store latency values as a comma-separated list for later analysis
    const currentLatencies =
      (await this.redisService.hget(this.LATENCY_KEY, keyType)) || '';
    const newLatencies = currentLatencies
      ? `${currentLatencies},${latencyMs}`
      : `${latencyMs}`;

    await this.redisService.hset(this.LATENCY_KEY, keyType, newLatencies);
  }

  async getStats(): Promise<any> {
    const hits = await this.redisService.hgetall(this.HITS_KEY);
    const misses = await this.redisService.hgetall(this.MISS_KEY);

    const stats = {
      hits,
      misses,
      hitRatios: {},
    };

    // Calculate hit ratios
    for (const keyType in hits) {
      const hitCount = parseInt(hits[keyType] || '0', 10);
      const missCount = parseInt(misses[keyType] || '0', 10);
      const total = hitCount + missCount;

      if (total > 0) {
        stats.hitRatios[keyType] = (hitCount / total) * 100;
      } else {
        stats.hitRatios[keyType] = 0;
      }
    }

    return stats;
  }

  async resetStats(): Promise<void> {
    await this.redisService.delHash(this.HITS_KEY);
    await this.redisService.delHash(this.MISS_KEY);
    await this.redisService.delHash(this.LATENCY_KEY);
  }
}
