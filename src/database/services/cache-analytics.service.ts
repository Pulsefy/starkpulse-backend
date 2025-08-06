import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ClusterHealth } from "./redis-cluster.service"

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  totalOperations: number
  averageResponseTime: number
  errorRate: number
  memoryUsage: number
  keyCount: number
  evictions: number
  compressionRatio: number
}

export interface OperationMetric {
  operation: string
  count: number
  totalDuration: number
  averageDuration: number
  successRate: number
  errors: number
}

export interface CacheAnalytics {
  metrics: CacheMetrics
  operations: OperationMetric[]
  topKeys: Array<{ key: string; hits: number; lastAccessed: Date }>
  clusterHealth?: ClusterHealth
  timestamp: Date
}

@Injectable()
export class CacheAnalyticsService {
  private readonly logger = new Logger(CacheAnalyticsService.name)
  private metrics: Map<string, any> = new Map()
  private operations: Map<string, OperationMetric> = new Map()
  private keyStats: Map<string, { hits: number; lastAccessed: Date }> = new Map()
  private clusterHealth: ClusterHealth | null = null

  constructor(private readonly configService: ConfigService) {}

  recordHit(key: string): void {
    this.incrementMetric("hits")
    this.updateKeyStats(key)
  }

  recordMiss(key: string): void {
    this.incrementMetric("misses")
  }

  recordOperation(operation: string, duration: number, success: boolean): void {
    const existing = this.operations.get(operation) || {
      operation,
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      successRate: 0,
      errors: 0,
    }

    existing.count++
    existing.totalDuration += duration
    existing.averageDuration = existing.totalDuration / existing.count

    if (!success) {
      existing.errors++
    }

    existing.successRate = ((existing.count - existing.errors) / existing.count) * 100

    this.operations.set(operation, existing)
  }

  recordError(type: string, message: string): void {
    this.incrementMetric(`errors.${type}`)
    this.logger.error(`Cache error [${type}]: ${message}`)
  }

  recordMemoryUsage(bytes: number): void {
    this.setMetric("memoryUsage", bytes)
  }

  recordKeyCount(count: number): void {
    this.setMetric("keyCount", count)
  }

  recordEviction(key: string): void {
    this.incrementMetric("evictions")
    this.keyStats.delete(key)
  }

  recordCompressionRatio(ratio: number): void {
    const currentRatio = this.getMetric("compressionRatio") || 0
    const count = this.getMetric("compressionCount") || 0
    const newRatio = (currentRatio * count + ratio) / (count + 1)

    this.setMetric("compressionRatio", newRatio)
    this.incrementMetric("compressionCount")
  }

  recordClusterHealth(health: ClusterHealth): void {
    this.clusterHealth = health
  }

  getMetrics(): CacheMetrics {
    const hits = this.getMetric("hits") || 0
    const misses = this.getMetric("misses") || 0
    const totalOperations = hits + misses
    const hitRate = totalOperations > 0 ? (hits / totalOperations) * 100 : 0

    const totalDuration = Array.from(this.operations.values()).reduce((sum, op) => sum + op.totalDuration, 0)
    const totalCount = Array.from(this.operations.values()).reduce((sum, op) => sum + op.count, 0)
    const averageResponseTime = totalCount > 0 ? totalDuration / totalCount : 0

    const totalErrors = Array.from(this.operations.values()).reduce((sum, op) => sum + op.errors, 0)
    const errorRate = totalCount > 0 ? (totalErrors / totalCount) * 100 : 0

    return {
      hits,
      misses,
      hitRate,
      totalOperations,
      averageResponseTime,
      errorRate,
      memoryUsage: this.getMetric("memoryUsage") || 0,
      keyCount: this.getMetric("keyCount") || 0,
      evictions: this.getMetric("evictions") || 0,
      compressionRatio: this.getMetric("compressionRatio") || 1,
    }
  }

  getOperationMetrics(): OperationMetric[] {
    return Array.from(this.operations.values()).sort((a, b) => b.count - a.count)
  }

  getTopKeys(limit = 10): Array<{ key: string; hits: number; lastAccessed: Date }> {
    return Array.from(this.keyStats.entries())
      .map(([key, stats]) => ({ key, ...stats }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
  }

  getAnalytics(): CacheAnalytics {
    return {
      metrics: this.getMetrics(),
      operations: this.getOperationMetrics(),
      topKeys: this.getTopKeys(),
      clusterHealth: this.clusterHealth,
      timestamp: new Date(),
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private logMetrics(): void {
    const analytics = this.getAnalytics()

    this.logger.log(
      `Cache Analytics - Hit Rate: ${analytics.metrics.hitRate.toFixed(2)}%, ` +
        `Avg Response Time: ${analytics.metrics.averageResponseTime.toFixed(2)}ms, ` +
        `Error Rate: ${analytics.metrics.errorRate.toFixed(2)}%`,
    )

    // Log cluster health if available
    if (analytics.clusterHealth) {
      this.logger.log(
        `Cluster Health - Healthy Nodes: ${analytics.clusterHealth.healthyNodes}/${analytics.clusterHealth.totalNodes}, ` +
          `State: ${analytics.clusterHealth.clusterState}`,
      )
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  private cleanupOldStats(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    for (const [key, stats] of this.keyStats.entries()) {
      if (stats.lastAccessed < cutoffTime) {
        this.keyStats.delete(key)
      }
    }

    this.logger.log(`Cleaned up old cache statistics. Current key count: ${this.keyStats.size}`)
  }

  private incrementMetric(key: string): void {
    const current = this.metrics.get(key) || 0
    this.metrics.set(key, current + 1)
  }

  private setMetric(key: string, value: any): void {
    this.metrics.set(key, value)
  }

  private getMetric(key: string): any {
    return this.metrics.get(key)
  }

  private updateKeyStats(key: string): void {
    const existing = this.keyStats.get(key) || { hits: 0, lastAccessed: new Date() }
    existing.hits++
    existing.lastAccessed = new Date()
    this.keyStats.set(key, existing)
  }

  reset(): void {
    this.metrics.clear()
    this.operations.clear()
    this.keyStats.clear()
    this.clusterHealth = null
    this.logger.log("Cache analytics reset")
  }
}
