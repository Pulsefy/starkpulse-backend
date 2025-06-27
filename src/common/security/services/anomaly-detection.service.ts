import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SecurityEvent, SecurityEventType } from '../entities/security-event.entity';
import { SecurityAnomaly, AnomalyType } from '../entities/security-anomaly.entity';

@Injectable()
export class AnomalyDetectionService {
  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
  ) {}

  async detectAnomalies(event: SecurityEvent): Promise<any[]> {
    const anomalies: any[] = [];

    // Brute-force login detection
    if (event.eventType === SecurityEventType.LOGIN_FAILURE && event.userId && event.ipAddress) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentFailures = await this.securityEventRepository.count({
        where: {
          eventType: SecurityEventType.LOGIN_FAILURE,
          userId: event.userId,
          ipAddress: event.ipAddress,
          createdAt: MoreThan(tenMinutesAgo),
        },
      });
      if (recentFailures >= 5) {
        anomalies.push({
          type: AnomalyType.UNUSUAL_LOGIN_PATTERN,
          confidence: 0.9,
          baselineData: { threshold: 5 },
          anomalyData: { recentFailures },
          context: { userId: event.userId, ipAddress: event.ipAddress },
          description: `More than 5 failed login attempts from the same IP in 10 minutes`,
          threatScore: 80,
        } as any);
      }
    }

    // Add more rules here as needed

    return anomalies;
  }
} 