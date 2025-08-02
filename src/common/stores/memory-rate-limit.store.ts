import { Injectable, Logger } from '@nestjs/common';
import { RateLimitStore } from './rate-limit-store.interface';
import { RateLimitResult } from '../interfaces/rate-limit.interface';

interface MemoryRecord {
  totalHits: number;
  windowStart: Date;
  resetTime: Date;
}

@Injectable()
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly logger = new Logger(MemoryRateLimitStore.name);
  private readonly store = new Map<string, MemoryRecord>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  async hit(
    key: string,
    windowMs: number,
    max: number,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / windowMs) * windowMs,
    );
    const resetTime = new Date(windowStart.getTime() + windowMs);

    let record = this.store.get(key);

    if (!record || record.windowStart.getTime() !== windowStart.getTime()) {
      record = {
        totalHits: 1,
        windowStart,
        resetTime,
      };
    } else {
      record.totalHits++;
    }

    this.store.set(key, record);

    const remaining = Math.max(0, max - record.totalHits);
    const allowed = record.totalHits <= max;

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: record.totalHits,
      windowStart,
    };
  }

  async get(key: string): Promise<RateLimitResult | null> {
    const record = this.store.get(key);
    if (!record) return null;

    const now = new Date();
    if (now > record.resetTime) {
      this.store.delete(key);
      return null;
    }

    return {
      allowed: true,
      remaining: 0,
      resetTime: record.resetTime,
      totalHits: record.totalHits,
      windowStart: record.windowStart,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / windowMs) * windowMs,
    );
    const resetTime = new Date(windowStart.getTime() + windowMs);

    let record = this.store.get(key);

    if (!record || record.windowStart.getTime() !== windowStart.getTime()) {
      record = {
        totalHits: 1,
        windowStart,
        resetTime,
      };
    } else {
      record.totalHits++;
    }

    this.store.set(key, record);
    return record.totalHits;
  }

  private cleanup(): void {
    const now = new Date();
    const expired: string[] = [];

    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.store.delete(key));

    if (expired.length > 0) {
      this.logger.debug(
        `Cleaned up ${expired.length} expired rate limit records`,
      );
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
