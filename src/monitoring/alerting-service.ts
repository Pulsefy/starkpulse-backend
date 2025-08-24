import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private activeAlerts: Map<string, any> = new Map();

  constructor(private readonly httpService: HttpService) {}

  async sendAlert(
    alertType: string,
    data: any,
    severity: 'low' | 'medium' | 'high' = 'medium',
  ) {
    try {
      // Implementation for sending alerts
      this.logger.warn(`Alert [${severity.toUpperCase()}]: ${alertType}`, data);

      // Store active alert
      const alertId = `${alertType}_${Date.now()}`;
      this.activeAlerts.set(alertId, {
        type: alertType,
        data,
        severity,
        timestamp: new Date(),
      });

      // If you have webhook endpoints for alerts
      // const response = await this.httpService.post(webhookUrl, alertData).toPromise();
    } catch (error) {
      this.logger.error('Failed to send alert:', error);
    }
  }

  // Add missing methods
  async sendTestAlert() {
    await this.sendAlert(
      'test_alert',
      { message: 'This is a test alert' },
      'low',
    );
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  clearResolvedAlerts(): number {
    const beforeCount = this.activeAlerts.size;
    // Clear alerts older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp < oneDayAgo) {
        this.activeAlerts.delete(key);
      }
    }

    return beforeCount - this.activeAlerts.size;
  }
}
