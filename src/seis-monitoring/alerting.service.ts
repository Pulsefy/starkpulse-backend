import { Injectable, Logger } from "@nestjs/common"
import { type EventEmitter2, OnEvent } from "@nestjs/event-emitter"
import type { SecurityEvent } from "../common/security/entities/security-event.entity"
import type { SecurityIncident } from "src/security/security-incident.entity"

export interface AlertChannel {
  type: "email" | "slack" | "webhook" | "sms"
  config: Record<string, any>
}

export interface AlertRule {
  id: string
  name: string
  condition: string
  severity: "low" | "medium" | "high" | "critical"
  channels: AlertChannel[]
  enabled: boolean
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name)

  private alertRules: AlertRule[] = [
    {
      id: "high-risk-event",
      name: "High Risk Security Event",
      condition: "riskScore > 0.8",
      severity: "high",
      channels: [
        { type: "email", config: { recipients: ["security@company.com"] } },
        { type: "slack", config: { channel: "#security-alerts" } },
      ],
      enabled: true,
    },
    {
      id: "critical-incident",
      name: "Critical Security Incident",
      condition: "severity = critical",
      severity: "critical",
      channels: [
        { type: "email", config: { recipients: ["security@company.com", "ciso@company.com"] } },
        { type: "slack", config: { channel: "#security-critical" } },
        { type: "sms", config: { numbers: ["+1234567890"] } },
      ],
      enabled: true,
    },
  ]

  constructor(private eventEmitter: EventEmitter2) {}

  @OnEvent("security.event.created")
  async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const applicableRules = this.alertRules.filter(
        (rule) => rule.enabled && this.evaluateCondition(rule.condition, event),
      )

      for (const rule of applicableRules) {
        await this.sendAlert(rule, {
          type: "security_event",
          data: event,
          message: `Security event detected: ${event.eventType} (Risk Score: ${event.riskScore})`,
        })
      }
    } catch (error) {
      this.logger.error(`Failed to handle security event alert: ${error.message}`, error.stack)
    }
  }

  @OnEvent("security.incident.created")
  async handleSecurityIncident(data: { incident: SecurityIncident; recipients: string[] }): Promise<void> {
    try {
      const { incident, recipients } = data

      const applicableRules = this.alertRules.filter(
        (rule) => rule.enabled && this.evaluateIncidentCondition(rule.condition, incident),
      )

      for (const rule of applicableRules) {
        await this.sendAlert(rule, {
          type: "security_incident",
          data: incident,
          message: `Security incident created: ${incident.title} (Severity: ${incident.severity})`,
          recipients,
        })
      }
    } catch (error) {
      this.logger.error(`Failed to handle security incident alert: ${error.message}`, error.stack)
    }
  }

  @OnEvent("security.response.*")
  async handleResponseAction(eventName: string, data: any): Promise<void> {
    try {
      const action = eventName.split(".").pop()

      await this.sendAlert(
        {
          id: "response-action",
          name: "Automated Response Action",
          condition: "",
          severity: "medium",
          channels: [{ type: "slack", config: { channel: "#security-responses" } }],
          enabled: true,
        },
        {
          type: "response_action",
          data,
          message: `Automated response executed: ${action}`,
        },
      )
    } catch (error) {
      this.logger.error(`Failed to handle response action alert: ${error.message}`, error.stack)
    }
  }

  private async sendAlert(
    rule: AlertRule,
    alertData: {
      type: string
      data: any
      message: string
      recipients?: string[]
    },
  ): Promise<void> {
    for (const channel of rule.channels) {
      try {
        switch (channel.type) {
          case "email":
            await this.sendEmailAlert(channel, alertData)
            break
          case "slack":
            await this.sendSlackAlert(channel, alertData)
            break
          case "webhook":
            await this.sendWebhookAlert(channel, alertData)
            break
          case "sms":
            await this.sendSMSAlert(channel, alertData)
            break
        }

        this.logger.log(`Alert sent via ${channel.type} for rule: ${rule.name}`)
      } catch (error) {
        this.logger.error(`Failed to send alert via ${channel.type}: ${error.message}`)
      }
    }
  }

  private async sendEmailAlert(channel: AlertChannel, alertData: any): Promise<void> {
    // Emit event for email service
    this.eventEmitter.emit("notification.email.send", {
      recipients: channel.config.recipients,
      subject: `Security Alert: ${alertData.message}`,
      body: this.formatAlertMessage(alertData),
      priority: "high",
    })
  }

  private async sendSlackAlert(channel: AlertChannel, alertData: any): Promise<void> {
    // Emit event for Slack integration
    this.eventEmitter.emit("notification.slack.send", {
      channel: channel.config.channel,
      message: this.formatSlackMessage(alertData),
      color: this.getSeverityColor(alertData.data.severity),
    })
  }

  private async sendWebhookAlert(channel: AlertChannel, alertData: any): Promise<void> {
    // Emit event for webhook service
    this.eventEmitter.emit("notification.webhook.send", {
      url: channel.config.url,
      payload: {
        alert: alertData.message,
        data: alertData.data,
        timestamp: new Date().toISOString(),
      },
    })
  }

  private async sendSMSAlert(channel: AlertChannel, alertData: any): Promise<void> {
    // Emit event for SMS service
    this.eventEmitter.emit("notification.sms.send", {
      numbers: channel.config.numbers,
      message: `SECURITY ALERT: ${alertData.message}`,
    })
  }

  private evaluateCondition(condition: string, event: SecurityEvent): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      if (condition.includes("riskScore >")) {
        const threshold = Number.parseFloat(condition.split(">")[1].trim())
        return event.riskScore > threshold
      }

      if (condition.includes("severity =")) {
        const severity = condition.split("=")[1].trim().replace(/['"]/g, "")
        return event.severity === severity
      }

      return false
    } catch (error) {
      this.logger.error(`Failed to evaluate condition: ${condition}`, error.stack)
      return false
    }
  }

  private evaluateIncidentCondition(condition: string, incident: SecurityIncident): boolean {
    try {
      if (condition.includes("severity =")) {
        const severity = condition.split("=")[1].trim().replace(/['"]/g, "")
        return incident.severity === severity
      }

      return false
    } catch (error) {
      this.logger.error(`Failed to evaluate incident condition: ${condition}`, error.stack)
      return false
    }
  }

  private formatAlertMessage(alertData: any): string {
    return `
Security Alert Details:
- Type: ${alertData.type}
- Message: ${alertData.message}
- Timestamp: ${new Date().toISOString()}
- Data: ${JSON.stringify(alertData.data, null, 2)}
    `.trim()
  }

  private formatSlackMessage(alertData: any): string {
    return `🚨 *Security Alert*\n\n*Message:* ${alertData.message}\n*Type:* ${alertData.type}\n*Time:* ${new Date().toISOString()}`
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical":
        return "#ff0000"
      case "high":
        return "#ff8800"
      case "medium":
        return "#ffaa00"
      case "low":
        return "#00aa00"
      default:
        return "#888888"
    }
  }

  async addAlertRule(rule: Omit<AlertRule, "id">): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    this.alertRules.push(newRule)
    this.logger.log(`Added new alert rule: ${newRule.name}`)

    return newRule
  }

  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const ruleIndex = this.alertRules.findIndex((rule) => rule.id === id)

    if (ruleIndex === -1) {
      throw new Error(`Alert rule not found: ${id}`)
    }

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates }
    this.logger.log(`Updated alert rule: ${id}`)

    return this.alertRules[ruleIndex]
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return this.alertRules
  }

  async deleteAlertRule(id: string): Promise<void> {
    const ruleIndex = this.alertRules.findIndex((rule) => rule.id === id)

    if (ruleIndex === -1) {
      throw new Error(`Alert rule not found: ${id}`)
    }

    this.alertRules.splice(ruleIndex, 1)
    this.logger.log(`Deleted alert rule: ${id}`)
  }
}
