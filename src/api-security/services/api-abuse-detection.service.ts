import { Injectable, Logger } from '@nestjs/common';

export interface AbuseDetectionResult {
  isAbusive: boolean;
  reason?: string;
  score?: number;
}

@Injectable()
export class ApiAbuseDetectionService {
  private readonly logger = new Logger(ApiAbuseDetectionService.name);
  private failedAttempts = new Map<string, number>();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly FAILED_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

  recordFailedAttempt(identifier: string): void {
    const currentCount = this.failedAttempts.get(identifier) || 0;
    this.failedAttempts.set(identifier, currentCount + 1);
    this.logger.warn(
      `Abuse Detection: Recorded failed attempt for ${identifier}. Count: ${currentCount + 1}`,
    );

    setTimeout(() => {
      const count = this.failedAttempts.get(identifier);
      if (count && count > 0) {
        this.failedAttempts.set(identifier, count - 1);
        const updatedCount = this.failedAttempts.get(identifier);
        if (updatedCount !== undefined && updatedCount <= 0) {
          this.failedAttempts.delete(identifier);
        }
      }
    }, this.FAILED_ATTEMPT_WINDOW_MS);
  }

  analyzeRequest(ip: string, userId?: string): AbuseDetectionResult {
    this.logger.log(
      `Abuse Detection: Analyzing request from IP: ${ip}, User: ${userId || 'N/A'}`,
    );

    const ipFailedCount = this.failedAttempts.get(ip) || 0;
    if (ipFailedCount >= this.MAX_FAILED_ATTEMPTS) {
      return {
        isAbusive: true,
        reason: 'Excessive failed attempts from IP',
        score: 0.8,
      };
    }

    if (Math.random() < 0.01) {
      return {
        isAbusive: true,
        reason: 'Suspicious request pattern detected',
        score: 0.6,
      };
    }

    return { isAbusive: false };
  }
}
