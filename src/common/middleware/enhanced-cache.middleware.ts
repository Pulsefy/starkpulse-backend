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
    }

    const cacheOptions = this.getCacheOptions(req)

    if (cacheOptions.skipIf && cacheOptions.skipIf(req)) {
      return next()
    }

    const cacheKey = this.generateCacheKey(req, cacheOptions.varyBy)

    this.handleCacheRequest(req, res, next, cacheKey, cacheOptions)
  }

  private async handleCacheRequest(
    req: Request,
    res: Response,
    next: NextFunction,
    cacheKey: string,
    options: CacheOptions,
  ): Promise<void> {
    try {
      // Try to get from cache
      const cachedData = await this.redisCluster.get(cacheKey)

      if (cachedData) {
        // Cache hit
        this.analytics.recordHit(cacheKey)

        try {
          const decompressed = await this.compression.decompress(
            Buffer.from(cachedData, "base64"),
            "", // metadata would be stored separately in production
          )

          const data = JSON.parse(decompressed.toString())

          res.setHeader("X-Cache", "HIT")
          res.setHeader("X-Cache-Key", cacheKey)
          res.json(data)
          return
        } catch (error) {
          this.logger.warn(`Failed to decompress cached data for key ${cacheKey}:`, error)
          // Fall through to cache miss
        }
      }

      // Cache miss - intercept response
      this.analytics.recordMiss(cacheKey)

      const originalSend = res.json.bind(res)
      let responseSent = false

      res.json = (data: any) => {
        if (!responseSent) {
          responseSent = true

          // Cache the response asynchronously
          this.cacheResponse(cacheKey, data, options).catch((error) => {
            this.logger.error(`Failed to cache response for key ${cacheKey}:`, error)
          })

          res.setHeader("X-Cache", "MISS")
          res.setHeader("X-Cache-Key", cacheKey)
        }

        return originalSend(data)
      }

      next()
    } catch (error) {
      this.logger.error(`Cache middleware error for key ${cacheKey}:`, error)
      this.analytics.recordError("middleware_error", error.message)
      next()
    }
  }

  private async cacheResponse(cacheKey: string, data: any, options: CacheOptions): Promise<void> {
    try {
      const compressionResult = await this.compression.compressJson(data)

      const ttl = options.ttl || this.defaultTTL
      await this.redisCluster.set(cacheKey, compressionResult.compressed.toString("base64"), ttl)

      // Tag the key if tags are provided
      if (options.tags && options.tags.length > 0) {
        this.invalidation.tagKey(cacheKey, options.tags)
      }

      this.analytics.recordCompressionRatio(compressionResult.stats.compressionRatio)

      this.logger.debug(
        `Cached response for key ${cacheKey} (TTL: ${ttl}s, Compression: ${compressionResult.stats.compressionRatio.toFixed(2)}x)`,
      )
    } catch (error) {
      this.logger.error(`Failed to cache response for key ${cacheKey}:`, error)
      this.analytics.recordError("cache_store_error", error.message)
    }
  }

  private getCacheOptions(req: Request): CacheOptions {
    // Extract cache options from request headers or route metadata
    const options: CacheOptions = {
      ttl: this.defaultTTL,
      tags: [],
      compress: true,
      varyBy: ["url", "query"],
    }

    // Check for cache control headers
    const cacheControl = req.headers["cache-control"]
    if (cacheControl) {
      const maxAge = cacheControl.match(/max-age=(\d+)/)
      if (maxAge) {
        options.ttl = Number.parseInt(maxAge[1])
      }
    }

    // Route-specific cache options
    if (req.path.startsWith("/api/market-data")) {
      options.tags = ["market-data"]
      options.ttl = 60 // 1 minute for market data
    } else if (req.path.startsWith("/api/portfolio")) {
      options.tags = ["portfolio"]
      options.ttl = 300 // 5 minutes for portfolio data
      options.varyBy = ["url", "query", "user"]
    } else if (req.path.startsWith("/api/news")) {
      options.tags = ["news"]
      options.ttl = 1800 // 30 minutes for news
    } else if (req.path.startsWith("/api/analytics")) {
      options.tags = ["analytics"]
      options.ttl = 3600 // 1 hour for analytics
    }

    // Skip caching for authenticated requests that require real-time data
    options.skipIf = (req: Request) => {
      return !!req.headers.authorization && req.path.includes("/real-time")
    }

    return options
  }

  private generateCacheKey(req: Request, varyBy: string[] = ["url"]): string {
    const parts: string[] = ["cache"]

    for (const vary of varyBy) {
      switch (vary) {
        case "url":
          parts.push(req.path)
          break
        case "query":
          if (Object.keys(req.query).length > 0) {
            const sortedQuery = Object.keys(req.query)
              .sort()
              .map((key) => `${key}=${req.query[key]}`)
              .join("&")
            parts.push(sortedQuery)
          }
          break
        case "user":
          const userId = req.headers["x-user-id"] || (req.user && (req.user as any).userId)
          if (userId) {
            parts.push(`user:${userId}`)
          }
          break
        case "headers":
          const relevantHeaders = ["accept", "accept-language"]
          for (const header of relevantHeaders) {
            if (req.headers[header]) {
              parts.push(`${header}:${req.headers[header]}`)
            }
          }
          break
      }
    }

    return parts.join(":")
  }
}
