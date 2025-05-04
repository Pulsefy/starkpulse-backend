/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/common/middleware/cache.middleware.ts (updated with monitoring)
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../common/module/redis/redis.service';
import { CacheMonitorService } from '../../common/module/redis/redis-monitoring.service'; // Update path as needed

@Injectable()
export class CacheMiddleware implements NestMiddleware {
  constructor(
    private readonly redisService: RedisService,
    private readonly monitorService: CacheMonitorService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `api:${req.originalUrl}`;
    const keyType = this.getKeyType(req.originalUrl);
    const startTime = Date.now();

    try {
      // Try to get from cache
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        // Record hit and latency
        const latency = Date.now() - startTime;
        await this.monitorService.recordHit(keyType);
        await this.monitorService.recordLatency(keyType, latency);

        // Return cached response
        return res.send(JSON.parse(cachedData));
      }

      // Record miss
      await this.monitorService.recordMiss(keyType);

      // Store the original send method
      const originalSend = res.send;

      // Override the response.send method to cache the response
      res.send = function (body) {
        // Only cache JSON responses
        if (
          res.getHeader('content-type')?.toString().includes('application/json')
        ) {
          // Cache the response
          const cacheData =
            typeof body === 'string' ? body : JSON.stringify(body);
          this.redisService
            .set(cacheKey, cacheData, getTTL(req.originalUrl))
            .catch((err) => console.error('Cache error:', err));
        }

        // Call the original send method
        return originalSend.call(this, body);
      } as any;

      next();
    } catch (error) {
      // If caching fails, continue without caching
      console.error('Caching error:', error);
      next();
    }
  }

  private getKeyType(url: string): string {
    if (url.includes('/news')) {
      return 'news';
    }

    if (url.includes('/market')) {
      return 'market';
    }

    return 'other';
  }
}

// Helper function to determine TTL based on URL
function getTTL(url: string): number {
  // News cache - 15 minutes
  if (url.includes('/news')) {
    return 900;
  }

  // Market data cache - 1 minute (more volatile)
  if (url.includes('/market')) {
    return 60;
  }

  // Default TTL - 5 minutes
  return 300;
}
