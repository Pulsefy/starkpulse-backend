import { Injectable } from '@nestjs/common';
import { SecurityEvent } from '../entities/security-event.entity';

@Injectable()
export class SecurityMetricsService {
  async updateEventMetrics(event: SecurityEvent): Promise<void> {
    // TODO: Implement metrics update logic
  }
} 