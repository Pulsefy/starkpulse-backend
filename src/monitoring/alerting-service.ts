import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AlertConfig {
  webhookUrl?: string;
  slackWebhookUrl?: string;
  emailConfig?: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    from: string;
    to: string[];
  };
  discordWebhookUrl?: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: string;
  resolved?: boolean;
  resolvedAt?: string;
}

export type AlertType = 
  | 'HEALTH_CHECK_FAILED'
  | 'SYSTEM_UNHEALTHY'
  | 'SYSTEM_DEGRADED'
  | 'HIGH_ERROR_RATE'
  | 'DATABASE_CONNECTION_FAILED'
  | 'MEMORY_USAGE_HIGH'
  | 'DISK_USAGE_HIGH'
  | 'RESPONSE_TIME_HIGH'
  | 'CUSTOM_ALERT';

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly alertConfig: AlertConfig;

  // Alert thresholds and rules
  private readonly alertRules = {
    HEALTH_CHECK_FAILED: { severity: 'critical' as const, cooldown: 300000 }, // 5 minutes
    SYSTEM_UNHEALTHY: { severity: 'critical' as const, cooldown: 300000 },
    SYSTEM_DEGRADED: { severity: 'high' as const, cooldown: 600000 }, // 10 minutes
    HIGH_ERROR_RATE: { severity: 'high' as const, cooldown: 300000 },
    DATABASE_CONNECTION_FAILED: { severity: 'critical' as const, cooldown: 180000 }, // 3 minutes
    MEMORY_USAGE_HIGH: { severity: 'medium' as const, cooldown: 900000 }, // 15 minutes
    DISK_USAGE_HIGH: { severity: 'medium' as const, cooldown: 1800000 }, // 30 minutes
    RESPONSE_TIME_HIGH: { severity: 'medium' as const, cooldown: 600000 },
    CUSTOM_ALERT: { severity: 'medium' as const, cooldown: 300000 },
  };

  private lastAlertTimes: Map<string, number> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.alertConfig = {
      webhookUrl: this.configService.get<string>('ALERT_WEBHOOK_URL'),
      slackWebhookUrl: this.configService.get<string>('SLACK_WEBHOOK_URL'),
      discordWebhookUrl: this.configService.get<string>('DISCORD_WEBHOOK_URL'),
      emailConfig: {
        smtp: {
          host: this.configService.get<string>('SMTP_HOST', 'localhost'),
          port: this.configService.get<number>('SMTP_PORT', 587),
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: this.configService.get<string>('SMTP_USER', ''),
            pass: this.configService.get<string>('SMTP_PASS', ''),
          },
        },
        from: this.configService.get<string>('ALERT_FROM_EMAIL', 'alerts@example.com'),
        to: this.configService.get<string>('ALERT_TO_EMAILS', '').split(',').filter(Boolean),
      },
    };
  }

  async sendAlert(type: AlertType, data: Record<string, any>): Promise<void> {
    const alertKey = `${type}_${JSON.stringify(data)}`;
    const now = Date.now();
    const rule = this.alertRules[type];
    
    // Check cooldown period
    const lastAlertTime = this.lastAlertTimes.get(alertKey);
    if (lastAlertTime && (now - lastAlertTime) < rule.cooldown) {
      this.logger.debug(`Alert ${type} is in cooldown period`);
      return;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity: rule.severity,
      title: this.getAlertTitle(type),
      message: this.getAlertMessage(type, data),
      data,
      timestamp: new Date().toISOString(),
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.lastAlertTimes.set(alertKey, now);

    this.logger.warn(`Alert triggered: ${alert.title}`, { alert });

    // Send notifications
    await Promise.allSettled([
      this.sendSlackAlert(alert),
      this.sendDiscordAlert(alert),
      this.sendWebhookAlert(alert),
      this.sendEmailAlert(alert),
    ]);
  }

  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.alertConfig.slackWebhookUrl) return;

    try {
      const payload = {
        text: `🚨 ${alert.title}`,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Time',
                value: alert.timestamp,
                short: true,
              },
              {
                title: 'Message',
                value: alert.message,
                short: false,
              },
            ],
          },
        ],
      };

      await firstValueFrom(
        this.httpService.post(this.alertConfig.slackWebhookUrl, payload),
      );
      this.logger.debug('Slack alert sent successfully');
    } catch (error) {
      this.logger.error('Failed to send Slack alert:', error);
    }
  }

  private async sendDiscordAlert(alert: Alert): Promise<void> {
    if (!this.alertConfig.discordWebhookUrl) return;

    try {
      const payload = {
        content: `🚨 **${alert.title}**`,
        embeds: [
          {
            title: alert.title,
            description: alert.message,
            color: this.getSeverityColorHex(alert.severity),
            fields: [
              {
                name: 'Severity',
                value: alert.severity.toUpperCase(),
                inline: true,
              },
              {
                name: 'Time',
                value: alert.timestamp,
                inline: true,
              },
            ],
            timestamp: alert.timestamp,
          },
        ],
      };

      await firstValueFrom(
        this.httpService.post(this.alertConfig.discordWebhookUrl, payload),
      );
      this.logger.debug('Discord alert sent successfully');
    } catch (error) {
      this.logger.error('Failed to send Discord alert:', error);
    }
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    if (!this.alertConfig.webhookUrl) return;

    try {
      await firstValueFrom(
        this.httpService.post(this.alertConfig.webhookUrl, alert),
      );
      this.logger.debug('Webhook alert sent successfully');
    } catch (error) {
      this.logger.error('Failed to send webhook alert:', error);
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.alertConfig.emailConfig?.to.length) return;

    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter(this.alertConfig.emailConfig.smtp);

      const mailOptions = {
        from: this.alertConfig.emailConfig.from,
        to: this.alertConfig.emailConfig.to.join(','),
        subject: `🚨 Alert: ${alert.title}`,
        html: this.generateEmailTemplate(alert),
      };

      await transporter.sendMail(mailOptions);
      this.logger.debug('Email alert sent successfully');
    } catch (error) {
      this.logger.error('Failed to send email alert:', error);
    }
  }

  private generateEmailTemplate(alert: Alert): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${this.getSeverityColor(alert.severity)};">🚨 ${alert.title}</h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Severity:</strong> <span style="color: ${this.getSeverityColor(alert.severity)}; text-transform: uppercase;">${alert.severity}</span></p>
              <p><strong>Time:</strong> ${alert.timestamp}</p>
              <p><strong>Alert ID:</strong> ${alert.id}</p>
            </div>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid ${this.getSeverityColor(alert.severity)}; margin: 20px 0;">
              <h3>Message:</h3>
              <p>${alert.message}</p>
            </div>
            ${Object.keys(alert.data).length > 0 ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Additional Data:</h3>
              <pre style="background-color: #e9ecef; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(alert.data, null, 2)}</pre>
            </div>
            ` : ''}
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #6c757d;">
              This is an automated alert from your application monitoring system.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private getAlertTitle(type: AlertType): string {
    const titles = {
      HEALTH_CHECK_FAILED: 'Health Check Failed',
      SYSTEM_UNHEALTHY: 'System Unhealthy',
      SYSTEM_DEGRADED: 'System Performance Degraded',
      HIGH_ERROR_RATE: 'High Error Rate Detected',
      DATABASE_CONNECTION_FAILED: 'Database Connection Failed',
      MEMORY_USAGE_HIGH: 'High Memory Usage',
      DISK_USAGE_HIGH: 'High Disk Usage',
      RESPONSE_TIME_HIGH: 'High Response Time',
      CUSTOM_ALERT: 'Custom Alert',
    };
    return titles[type] || 'Unknown Alert';
  }

  private getAlertMessage(type: AlertType, data: Record<string, any>): string {
    const messages = {
      HEALTH_CHECK_FAILED: `Health check failed with error: ${data.error || 'Unknown error'}`,
      SYSTEM_UNHEALTHY: `System is unhealthy. Status: ${data.status}`,
      SYSTEM_DEGRADED: `System performance is degraded. Status: ${data.status}`,
      HIGH_ERROR_RATE: `Error rate is high: ${data.rate || 'Unknown'}%`,
      DATABASE_CONNECTION_FAILED: `Database connection failed: ${data.error || 'Connection timeout'}`,
      MEMORY_USAGE_HIGH: `Memory usage is high: ${data.usage || 'Unknown'}%`,
      DISK_USAGE_HIGH: `Disk usage is high: ${data.usage || 'Unknown'}%`,
      RESPONSE_TIME_HIGH: `Response time is high: ${data.responseTime || 'Unknown'}ms`,
      CUSTOM_ALERT: data.message || 'Custom alert triggered',
    };
    return messages[type] || 'Alert triggered';
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545',
    };
    return colors[severity] || '#6c757d';
  }

  private getSeverityColorHex(severity: string): number {
    const colors = {
      low: 0x28a745,
      medium: 0xffc107,
      high: 0xfd7e14,
      critical: 0xdc3545,
    };
    return colors[severity] || 0x6c757d;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Alert management methods
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    this.alerts.set(alertId, alert);

    this.logger.log(`Alert resolved: ${alertId}`);
    return true;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  getAlertById(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  clearResolvedAlerts(): number {
    const resolved = Array.from(this.alerts.values()).filter(alert => alert.resolved);
    resolved.forEach(alert => this.alerts.delete(alert.id));
    return resolved.length;
  }

  // Test alert functionality
  async sendTestAlert(): Promise<void> {
    await this.sendAlert('CUSTOM_ALERT', {
      message: 'This is a test alert to verify the alerting system is working correctly.',
      test: true,
      timestamp: new Date().toISOString(),
    });
  }
}