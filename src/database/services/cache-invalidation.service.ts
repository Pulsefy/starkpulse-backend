import { Injectable, Logger, type OnModuleInit } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { type EventEmitter2, OnEvent } from "@nestjs/event-emitter"
import type { RedisClusterService } from "./redis-cluster.service"
import type { CacheAnalyticsService } from "./cache-analytics.service"

export interface InvalidationRule {
  pattern: string
  triggers: string[]
  ttl?: number
  priority: number
}

export interface InvalidationEvent {
  type: string
  data: any
  timestamp: Date
  source: string
}

export enum InvalidationStrategy {
  IMMEDIATE = "immediate",
  LAZY = "lazy",
  SCHEDULED = "scheduled",
  TAG_BASED = "tag-based",
}

@Injectable()
export class CacheInvalidationService implements OnModuleInit {
  private readonly logger = new Logger(CacheInvalidationService.name)
  private invalidationRules: Map<string, InvalidationRule> = new Map()
  private taggedKeys: Map<string, Set<string>> = new Map() // tag -> keys
  private keyTags: Map<string, Set<string>> = new Map() // key -> tags
  private pendingInvalidations: Map<string, NodeJS.Timeout> = new Map()

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisCluster: RedisClusterService,
    private readonly analytics: CacheAnalyticsService,
  ) {}

  async onModuleInit() {
    this.setupDefaultRules()
    this.setupEventListeners()
  }

  private setupDefaultRules(): void {
    // Market data invalidation rules
    this.addRule("market-data", {
      pattern: "market:*",
      triggers: ["price.updated", "market.data.changed"],
      ttl: 60, // 1 minute
      priority: 1,
    })

    // User portfolio invalidation rules
    this.addRule("portfolio", {
      pattern: "portfolio:*",
      triggers: ["transaction.confirmed", "portfolio.updated"],
      ttl: 300, // 5 minutes
      priority: 2,
    })

    // News invalidation rules
    this.addRule("news", {
      pattern: "news:*",
      triggers: ["news.published", "news.updated"],
      ttl: 1800, // 30 minutes
      priority: 3,
    })

    // Analytics invalidation rules
    this.addRule("analytics", {
      pattern: "analytics:*",
      triggers: ["analytics.updated", "user.activity"],
      ttl: 3600, // 1 hour
      priority: 4,
    })
  }

  private setupEventListeners(): void {
    // Listen for real-time data events
    this.eventEmitter.on("price.updated", (data) => {
      this.handleInvalidationEvent({
        type: "price.updated",
        data,
        timestamp: new Date(),
        source: "price-service",
      })
    })

    this.eventEmitter.on("transaction.confirmed", (data) => {
      this.handleInvalidationEvent({
        type: "transaction.confirmed",
        data,
        timestamp: new Date(),
        source: "blockchain-service",
      })
    })

    this.eventEmitter.on("market.data.changed", (data) => {
      this.handleInvalidationEvent({
        type: "market.data.changed",
        data,
        timestamp: new Date(),
        source: "market-service",
      })
    })
  }

  addRule(name: string, rule: InvalidationRule): void {
    this.invalidationRules.set(name, rule)
    this.logger.log(`Added invalidation rule: ${name}`)
  }

  removeRule(name: string): void {
    this.invalidationRules.delete(name)
    this.logger.log(`Removed invalidation rule: ${name}`)
  }

  async invalidateByPattern(
    pattern: string,
    strategy: InvalidationStrategy = InvalidationStrategy.IMMEDIATE,
  ): Promise<number> {
    try {
      const keys = await this.redisCluster.keys(pattern)

      if (keys.length === 0) {
        return 0
      }

      switch (strategy) {
        case InvalidationStrategy.IMMEDIATE:
          return await this.immediateInvalidation(keys)
        case InvalidationStrategy.LAZY:
          return await this.lazyInvalidation(keys)
        case InvalidationStrategy.SCHEDULED:
          return await this.scheduledInvalidation(keys)
        default:
          return await this.immediateInvalidation(keys)
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${pattern}:`, error)
      this.analytics.recordError("invalidation_error", error.message)
      return 0
    }
  }

  async invalidateByTag(tag: string, strategy: InvalidationStrategy = InvalidationStrategy.IMMEDIATE): Promise<number> {
    const keys = this.taggedKeys.get(tag)

    if (!keys || keys.size === 0) {
      return 0
    }

    const keyArray = Array.from(keys)

    switch (strategy) {
      case InvalidationStrategy.IMMEDIATE:
        return await this.immediateInvalidation(keyArray)
      case InvalidationStrategy.LAZY:
        return await this.lazyInvalidation(keyArray)
      case InvalidationStrategy.SCHEDULED:
        return await this.scheduledInvalidation(keyArray)
      default:
        return await this.immediateInvalidation(keyArray)
    }
  }

  async invalidateKey(key: string): Promise<boolean> {
    try {
      const result = await this.redisCluster.del(key)

      if (result > 0) {
        this.removeKeyFromTags(key)
        this.analytics.recordEviction(key)
        this.logger.debug(`Invalidated key: ${key}`)
        return true
      }

      return false
    } catch (error) {
      this.logger.error(`Failed to invalidate key ${key}:`, error)
      this.analytics.recordError("key_invalidation_error", error.message)
      return false
    }
  }

  tagKey(key: string, tags: string[]): void {
    // Add tags to key
    if (!this.keyTags.has(key)) {
      this.keyTags.set(key, new Set())
    }

    const keyTagSet = this.keyTags.get(key)!

    for (const tag of tags) {
      keyTagSet.add(tag)

      // Add key to tag
      if (!this.taggedKeys.has(tag)) {
        this.taggedKeys.set(tag, new Set())
      }
      this.taggedKeys.get(tag)!.add(key)
    }
  }

  private async immediateInvalidation(keys: string[]): Promise<number> {
    let invalidated = 0

    // Batch delete for better performance
    const batchSize = 100
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize)

      try {
        const results = await Promise.all(batch.map((key) => this.redisCluster.del(key)))

        const batchInvalidated = results.reduce((sum, result) => sum + result, 0)
        invalidated += batchInvalidated

        // Update analytics and cleanup tags
        batch.forEach((key) => {
          this.removeKeyFromTags(key)
          this.analytics.recordEviction(key)
        })
      } catch (error) {
        this.logger.error(`Failed to invalidate batch:`, error)
      }
    }

    this.logger.log(`Immediately invalidated ${invalidated} keys`)
    return invalidated
  }

  private async lazyInvalidation(keys: string[]): Promise<number> {
    // Mark keys for lazy deletion by setting very short TTL
    let marked = 0

    for (const key of keys) {
      try {
        await this.redisCluster.executeCommand("expire", key, 1) // 1 second TTL
        marked++
      } catch (error) {
        this.logger.error(`Failed to mark key for lazy invalidation: ${key}`, error)
      }
    }

    this.logger.log(`Marked ${marked} keys for lazy invalidation`)
    return marked
  }

  private async scheduledInvalidation(keys: string[], delay = 5000): Promise<number> {
    const batchId = `batch_${Date.now()}`

    const timeout = setTimeout(async () => {
      await this.immediateInvalidation(keys)
      this.pendingInvalidations.delete(batchId)
    }, delay)

    this.pendingInvalidations.set(batchId, timeout)

    this.logger.log(`Scheduled invalidation of ${keys.length} keys in ${delay}ms`)
    return keys.length
  }

  private async handleInvalidationEvent(event: InvalidationEvent): Promise<void> {
    this.logger.debug(`Handling invalidation event: ${event.type}`)

    // Find matching rules
    const matchingRules = Array.from(this.invalidationRules.entries())
      .filter(([_, rule]) => rule.triggers.includes(event.type))
      .sort((a, b) => a[1].priority - b[1].priority)

    for (const [ruleName, rule] of matchingRules) {
      try {
        const invalidated = await this.invalidateByPattern(rule.pattern)
        this.logger.log(`Rule '${ruleName}' invalidated ${invalidated} keys for event '${event.type}'`)
      } catch (error) {
        this.logger.error(`Failed to apply rule '${ruleName}':`, error)
      }
    }
  }

  private removeKeyFromTags(key: string): void {
    const tags = this.keyTags.get(key)

    if (tags) {
      for (const tag of tags) {
        const taggedKeys = this.taggedKeys.get(tag)
        if (taggedKeys) {
          taggedKeys.delete(key)
          if (taggedKeys.size === 0) {
            this.taggedKeys.delete(tag)
          }
        }
      }
      this.keyTags.delete(key)
    }
  }

  @OnEvent("cache.warmup.completed")
  private handleWarmupCompleted(data: any): void {
    this.logger.log("Cache warmup completed, updating invalidation tracking")
    // Update tracking for warmed up keys
  }

  getInvalidationStats(): {
    rules: number
    taggedKeys: number
    pendingInvalidations: number
  } {
    return {
      rules: this.invalidationRules.size,
      taggedKeys: this.keyTags.size,
      pendingInvalidations: this.pendingInvalidations.size,
    }
  }
}
