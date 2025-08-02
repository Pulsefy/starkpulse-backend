import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ConfigService } from "@nestjs/config"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { RedisClusterService } from "../../database/services/redis-cluster.service"
import { CacheCompressionService } from "../../database/services/cache-compression.service"
import { CacheAnalyticsService } from "../../database/services/cache-analytics.service"
import { CacheInvalidationService } from "../../database/services/cache-invalidation.service"

export interface WarmupStrategy {
  name: string
  endpoints: string[]
  priority: number
  schedule: string
  preload: boolean
  compression: boolean
  tags: string[]
  ttl: number
}

export interface WarmupResult {
  strategy: string
  success: number
  failed: number
  duration: number
  totalSize: number
  compressionRatio: number
}

@Injectable()
export class CacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmupService.name)
  private warmupStrategies: Map<string, WarmupStrategy> = new Map()
  private isWarmupInProgress = false
  private baseUrl: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisCluster: RedisClusterService,
    private readonly compression: CacheCompressionService,
    private readonly analytics: CacheAnalyticsService,
    private readonly invalidation: CacheInvalidationService,
  ) {
    this.baseUrl = this.configService.get("APP_URL", "http://localhost:3000")
  }

  async onModuleInit() {
    this.setupWarmupStrategies()

    // Initial warmup on startup
    if (this.configService.get("CACHE_WARMUP_ON_STARTUP", true)) {
      setTimeout(() => this.executeInitialWarmup(), 5000) // Wait 5 seconds after startup
    }
  }

  private setupWarmupStrategies(): void {
    // Critical market data - highest priority
    this.addStrategy("critical-market-data", {
      name: "Critical Market Data",
      endpoints: [
        "/api/market-data/prices/trending",
        "/api/market-data/volume/24h",
        "/api/market-data/market-cap/top-100",
      ],
      priority: 1,
      schedule: "*/5 * * * *", // Every 5 minutes
      preload: true,
      compression: true,
      tags: ["market-data", "critical"],
      ttl: 300, // 5 minutes
    })

    // Popular tokens and pairs
    this.addStrategy("popular-tokens", {
      name: "Popular Tokens",
      endpoints: [
        "/api/price/tokens/popular",
        "/api/market-data/pairs/volume-leaders",
        "/api/analytics/tokens/trending",
      ],
      priority: 2,
      schedule: "*/10 * * * *", // Every 10 minutes
      preload: true,
      compression: true,
      tags: ["tokens", "popular"],
      ttl: 600, // 10 minutes
    })

    // User portfolio data
    this.addStrategy("user-portfolios", {
      name: "User Portfolios",
      endpoints: ["/api/portfolio/active-users", "/api/analytics/portfolio/performance"],
      priority: 3,
      schedule: "*/15 * * * *", // Every 15 minutes
      preload: false,
      compression: true,
      tags: ["portfolio", "users"],
      ttl: 900, // 15 minutes
    })

    // News and updates
    this.addStrategy("news-content", {
      name: "News Content",
      endpoints: ["/api/news/trending", "/api/news/categories/crypto", "/api/news/latest/10"],
      priority: 4,
      schedule: "*/30 * * * *", // Every 30 minutes
      preload: false,
      compression: true,
      tags: ["news", "content"],
      ttl: 1800, // 30 minutes
    })

    // Analytics and reports
    this.addStrategy("analytics-reports", {
      name: "Analytics Reports",
      endpoints: ["/api/analytics/market/summary", "/api/analytics/volume/daily", "/api/analytics/performance/weekly"],
      priority: 5,
      schedule: "0 */2 * * *", // Every 2 hours
      preload: false,
      compression: true,
      tags: ["analytics", "reports"],
      ttl: 7200, // 2 hours
    })
  }

  addStrategy(name: string, strategy: WarmupStrategy): void {
    this.warmupStrategies.set(name, strategy)
    this.logger.log(`Added warmup strategy: ${name}`)
  }

  removeStrategy(name: string): void {
    this.warmupStrategies.delete(name)
    this.logger.log(`Removed warmup strategy: ${name}`)
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async executeScheduledWarmup(): Promise<void> {
    if (this.isWarmupInProgress) {
      this.logger.warn("Warmup already in progress, skipping scheduled execution")
      return
    }

    const now = new Date()
    const strategies = Array.from(this.warmupStrategies.values())
      .filter((strategy) => this.shouldExecuteStrategy(strategy, now))
      .sort((a, b) => a.priority - b.priority)

    if (strategies.length > 0) {
      await this.executeWarmupStrategies(strategies)
    }
  }

  private shouldExecuteStrategy(strategy: WarmupStrategy, now: Date): boolean {
    // Simple cron-like check - in production, use a proper cron parser
    const minutes = now.getMinutes()

    if (strategy.schedule === "*/5 * * * *") {
      return minutes % 5 === 0
    } else if (strategy.schedule === "*/10 * * * *") {
      return minutes % 10 === 0
    } else if (strategy.schedule === "*/15 * * * *") {
      return minutes % 15 === 0
    } else if (strategy.schedule === "*/30 * * * *") {
      return minutes % 30 === 0
    } else if (strategy.schedule === "0 */2 * * *") {
      return minutes === 0 && now.getHours() % 2 === 0
    }

    return false
  }

  async executeInitialWarmup(): Promise<void> {
    this.logger.log("Starting initial cache warmup...")

    const preloadStrategies = Array.from(this.warmupStrategies.values())
      .filter((strategy) => strategy.preload)
      .sort((a, b) => a.priority - b.priority)

    await this.executeWarmupStrategies(preloadStrategies)
  }

  async executeWarmupStrategies(strategies: WarmupStrategy[]): Promise<WarmupResult[]> {
    if (this.isWarmupInProgress) {
      throw new Error("Warmup already in progress")
    }

    this.isWarmupInProgress = true
    const results: WarmupResult[] = []

    try {
      for (const strategy of strategies) {
        const result = await this.executeStrategy(strategy)
        results.push(result)

        // Small delay between strategies to avoid overwhelming the system
        await this.delay(1000)
      }

      this.eventEmitter.emit("cache.warmup.completed", { results })
      this.logger.log(`Cache warmup completed. Processed ${strategies.length} strategies`)
    } catch (error) {
      this.logger.error("Cache warmup failed:", error)
      this.analytics.recordError("warmup_error", error.message)
    } finally {
      this.isWarmupInProgress = false
    }

    return results
  }

  private async executeStrategy(strategy: WarmupStrategy): Promise<WarmupResult> {
    const startTime = Date.now()
    let success = 0
    let failed = 0
    let totalSize = 0
    let totalCompressionRatio = 0

    this.logger.log(`Executing warmup strategy: ${strategy.name}`)

    for (const endpoint of strategy.endpoints) {
      try {
        const response = await this.httpService.axiosRef.get(`${this.baseUrl}${endpoint}`, {
          timeout: 10000,
          headers: {
            "User-Agent": "CacheWarmupService/1.0",
            "X-Cache-Warmup": "true",
          },
        })

        if (response.status === 200 && response.data) {
          const cacheKey = this.generateCacheKey(endpoint)
          const dataSize = JSON.stringify(response.data).length

          // Compress and store data
          const compressionResult = await this.compression.compressJson(
            response.data,
            strategy.compression ? undefined : undefined,
          )

          await this.redisCluster.set(cacheKey, compressionResult.compressed.toString("base64"), strategy.ttl)

          // Tag the key for invalidation
          this.invalidation.tagKey(cacheKey, strategy.tags)

          success++
          totalSize += dataSize
          totalCompressionRatio += compressionResult.stats.compressionRatio

          this.analytics.recordCompressionRatio(compressionResult.stats.compressionRatio)

          this.logger.debug(
            `Warmed up: ${endpoint} (${dataSize} bytes, ${compressionResult.stats.compressionRatio.toFixed(2)}x compression)`,
          )
        }
      } catch (error) {
        failed++
        this.logger.error(`Failed to warm up ${endpoint}:`, error.message)
        this.analytics.recordError("warmup_endpoint_error", `${endpoint}: ${error.message}`)
      }
    }

    const duration = Date.now() - startTime
    const avgCompressionRatio = success > 0 ? totalCompressionRatio / success : 1

    const result: WarmupResult = {
      strategy: strategy.name,
      success,
      failed,
      duration,
      totalSize,
      compressionRatio: avgCompressionRatio,
    }

    this.logger.log(`Strategy '${strategy.name}' completed: ${success} success, ${failed} failed, ${duration}ms`)
    return result
  }

  async warmupSpecificEndpoints(endpoints: string[], ttl = 600): Promise<WarmupResult> {
    const strategy: WarmupStrategy = {
      name: "Manual Warmup",
      endpoints,
      priority: 0,
      schedule: "",
      preload: false,
      compression: true,
      tags: ["manual"],
      ttl,
    }

    return this.executeStrategy(strategy)
  }

  async warmupUserData(userId: string): Promise<void> {
    try {
      const userEndpoints = [
        `/api/portfolio/user/${userId}`,
        `/api/analytics/user/${userId}/performance`,
        `/api/notifications/user/${userId}/preferences`,
      ]

      await this.warmupSpecificEndpoints(userEndpoints, 900) // 15 minutes TTL
      this.logger.log(`Warmed up data for user: ${userId}`)
    } catch (error) {
      this.logger.error(`Failed to warm up user data for ${userId}:`, error)
    }
  }

  private generateCacheKey(endpoint: string): string {
    return `warmup:${endpoint.replace(/[^a-zA-Z0-9]/g, "_")}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  getWarmupStats(): {
    strategies: number
    inProgress: boolean
    lastExecution?: Date
  } {
    return {
      strategies: this.warmupStrategies.size,
      inProgress: this.isWarmupInProgress,
    }
  }

  // Manual warmup endpoints for admin use
  @Cron("0 6 * * 1-5") // Weekdays at 6 AM
  async dailyWarmup(): Promise<void> {
    this.logger.log("Starting daily cache warmup...")
    const allStrategies = Array.from(this.warmupStrategies.values()).sort((a, b) => a.priority - b.priority)

    await this.executeWarmupStrategies(allStrategies)
  }

  @Cron("0 */6 * * *") // Every 6 hours
  async periodicWarmup(): Promise<void> {
    const criticalStrategies = Array.from(this.warmupStrategies.values())
      .filter((strategy) => strategy.priority <= 2)
      .sort((a, b) => a.priority - b.priority)

    await this.executeWarmupStrategies(criticalStrategies)
  }
}
