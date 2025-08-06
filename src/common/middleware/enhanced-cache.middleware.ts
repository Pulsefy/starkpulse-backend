import { Injectable, NestMiddleware, Logger } from "@nestjs/common"
import { Request, Response, NextFunction } from "express"
import { ConfigService } from "@nestjs/config"
import { RedisClusterService } from "../../database/services/redis-cluster.service"
import { CacheCompressionService } from "../../database/services/cache-compression.service"
import { CacheAnalyticsService } from "../../database/services/cache-analytics.service"
import { CacheInvalidationService } from "../../database/services/cache-invalidation.service"

export interface CacheOptions {
  ttl?: number
  tags?: string[]
  compress?: boolean
  varyBy?: string[]
  skipIf?: (req: Request) => boolean
}

@Injectable()
export class EnhancedCacheMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EnhancedCacheMiddleware.name)
  private readonly defaultTTL: number
  private readonly cacheEnabled: boolean

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCluster: RedisClusterService,
    private readonly compression: CacheCompressionService,
    private readonly analytics: CacheAnalyticsService,
    private readonly invalidation: CacheInvalidationService,
  ) {
    this.defaultTTL = this.configService.get("CACHE_DEFAULT_TTL", 300)
    this.cacheEnabled = this.configService.get("CACHE_ENABLED", true)
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.cacheEnabled || req.method !== "GET") {
      return next()

