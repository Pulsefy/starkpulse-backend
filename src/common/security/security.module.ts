import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CsrfTokenService } from './csrf-token.service';
import { SecurityController } from './security.controller';
import { SecurityAuditController } from './security-audit.controller';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { CsrfMiddleware } from '../middleware/csrf.middleware';
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';
import { SecurityEvent } from './entities/security-event.entity';
import { SecurityAnomaly } from './entities/security-anomaly.entity';
import { SecurityThreat } from './entities/security-threat.entity';
import { SecurityAuditService } from './services/security-audit.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { ThreatIntelligenceService } from './services/threat-intelligence.service';
import { SecurityMetricsService } from './services/security-metrics.service';
import { MonitoringAlertService } from './services/monitoring-alert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SecurityEvent,
      SecurityAnomaly,
      SecurityThreat,
    ]),
  ],
  controllers: [SecurityController, SecurityAuditController],
  providers: [
    CsrfTokenService,
    RateLimitGuard,
    CsrfMiddleware,
    SecurityHeadersMiddleware,
    SecurityAuditService,
    AnomalyDetectionService,
    ThreatIntelligenceService,
    SecurityMetricsService,
    MonitoringAlertService,
  ],
  exports: [
    CsrfTokenService,
    RateLimitGuard,
    CsrfMiddleware,
    SecurityHeadersMiddleware,
    SecurityAuditService,
    AnomalyDetectionService,
    ThreatIntelligenceService,
    SecurityMetricsService,
    MonitoringAlertService,
  ],
})
export class SecurityModule {}
