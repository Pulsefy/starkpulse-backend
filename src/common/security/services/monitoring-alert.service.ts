import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SecurityAnomaly } from '../entities/security-anomaly.entity';
import { SecurityThreat } from '../entities/security-threat.entity';

@Injectable()
export class MonitoringAlertService {
  private readonly logger = new Logger(MonitoringAlertService.name);

  @OnEvent('security.anomaly.detected')
  handleAnomalyDetected(anomaly: SecurityAnomaly) {
    // Here you can integrate with external monitoring/alerting tools
    this.logger.warn(
      `ALERT: Security anomaly detected! Type: ${anomaly.anomalyType}, User: ${anomaly.userId}, IP: ${anomaly.ipAddress}, Confidence: ${anomaly.confidence}`,
    );
    // TODO: Send to Slack, PagerDuty, email, etc.
  }

  @OnEvent('security.threat.detected')
  handleThreatDetected(threat: SecurityThreat) {
    this.logger.error(
      `ALERT: Security threat detected! Type: ${threat.threatType}, Severity: ${threat.severity}, User: ${threat.userId}, IP: ${threat.ipAddress}`,
    );
    // TODO: Send to Slack, PagerDuty, email, etc.
  }

  @OnEvent('security.threat.automated_response')
  handleAutomatedResponse(threat: SecurityThreat) {
    this.logger.log(
      `Automated response triggered for threat: ${threat.threatType} (Severity: ${threat.severity})`,
    );
    // TODO: Notify monitoring system of automated response
  }
} 