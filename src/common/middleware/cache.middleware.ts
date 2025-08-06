import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService, CacheOptions } from '../cache/cache.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CacheMiddleware.name);
  private readonly cacheEnabled: boolean;

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.cacheEnabled = this.configService.get('CACHE_ENABLED', true);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!this.cacheEnabled || req.method !== 'GET') {
      return next();
    }

    const cacheKey = this.generateCacheKey(req);
    const cacheOptions = this.getCacheOptions(req);

    // Skip caching based on conditions
    if (this.shouldSkipCache(req)) {
      return next();
    }

    try {
      // Try to get from cache
      const cachedData = await this.cacheService.get(cacheKey, cacheOptions);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - intercept response
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      const originalJson = res.json.bind(res);
      let responseSent = false;

      res.json = (data: any) => {
        if (!responseSent) {
          responseSent = true;

          // Cache the response asynchronously
          this.cacheService.set(cacheKey, data, cacheOptions).catch((error) => {
            this.logger.error(`Failed to cache response for key ${cacheKey}:`, error);
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      this.logger.error(`Cache middleware error for key ${cacheKey}:`, error);
      next();
    }
  }

  private generateCacheKey(req: Request): string {
    const parts = ['api', req.path];
    
    // Include query parameters
    if (Object.keys(req.query).length > 0) {
      const sortedQuery = Object.keys(req.query)
        .sort()
        .map((key) => `${key}=${req.query[key]}`)
        .join('&');
      parts.push(sortedQuery);
    }
    
    // Include user context for personalized data
    const userId = req.headers['x-user-id'] || (req as any).user?.id;
    if (userId && req.path.includes('/portfolio')) {
      parts.push(`user:${userId}`);
    }
    
    return parts.join(':');
  }

  private getCacheOptions(req: Request): CacheOptions {
    const options: CacheOptions = {
      priority: 'medium',
      storeLevel: 'both',
    };

    // Route-specific optimizations
    if (req.path.startsWith('/api/market-data') || req.path.includes('/price')) {
      options.ttl = 60; // 1 minute
      options.tags = ['market-data'];
      options.priority = 'high';
    } else if (req.path.startsWith('/api/portfolio')) {
      options.ttl = 300; // 5 minutes
      options.tags = ['portfolio'];
      options.priority = 'high';
      options.storeLevel = 'redis'; // User data in Redis
    } else if (req.path.startsWith('/api/news')) {
      options.ttl = 1800; // 30 minutes
      options.tags = ['news'];
      options.compress = true;
    } else if (req.path.startsWith('/api/analytics')) {
      options.ttl = 3600; // 1 hour
      options.tags = ['analytics'];
      options.compress = true;
      options.priority = 'low';
    } else {
      options.ttl = 300; // 5 minutes default
    }

    return options;
  }

  private shouldSkipCache(req: Request): boolean {
    // Skip for real-time endpoints
    if (req.path.includes('/real-time') || req.path.includes('/live')) {
      return true;
    }
    
    // Skip for authenticated requests requiring fresh data
    if (req.headers.authorization && req.path.includes('/admin')) {
      return true;
    }
    
    // Skip for POST-like operations disguised as GET
    if (req.query.action || req.query.command) {
      return true;
    }
    
    return false;
  }
}
