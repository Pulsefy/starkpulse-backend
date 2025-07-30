import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { EventEmitter2 } from "@nestjs/event-emitter"
import type { SecurityEvent } from "../common/security/entities/security-event.entity"
import { SecurityIncident } from "./security-incident.entity"
import { IncidentStatus } from "./security-incident.entity"
import { IncidentSeverity } from "./security-incident.entity"

export interface ResponseAction {
  type: "block_ip" | "disable_user" | "alert_admin" | "quarantine_file" | "isolate_system"
  target: string
  metadata?: Record<string, any>
}

@Injectable()
export class IncidentResponseService {
  private readonly logger = new Logger(IncidentResponseService.name)

  constructor(
    private incidentRepository: Repository<SecurityIncident>,
    private securityEventRepository: Repository<SecurityEvent>,
    private eventEmitter: EventEmitter2,
  ) {}

  async handleThreatEvent(event: SecurityEvent): Promise<SecurityIncident | null> {
    try {
      // Determine if incident creation is needed
      const shouldCreateIncident = await this.shouldCreateIncident(event)

      if (!shouldCreateIncident) {
        this.logger.debug(`Event ${event.id} does not require incident creation`)
        return null
      }

      // Create security incident
      const incident = await this.createIncident(event)

      // Execute automated response actions
      const responseActions = await this.executeAutomatedResponse(event, incident)

      // Update incident with response actions
      incident.responseActions = responseActions.map((action) => `${action.type}:${action.target}`)
      await this.incidentRepository.save(incident)

      // Notify stakeholders
      await this.notifyStakeholders(incident)

      this.logger.warn(`Security incident created: ${incident.id} for event ${event.id}`)

      return incident
    } catch (error) {
      this.logger.error(`Failed to handle threat event: ${error.message}`, error.stack)
      throw error
    }
  }

  private async shouldCreateIncident(event: SecurityEvent): Promise<boolean> {
    // Check if there's already an open incident for this correlation
    if (event.correlationId) {
      const existingIncident = await this.incidentRepository.findOne({
        where: {
          status: IncidentStatus.OPEN,
          // In a real implementation, you'd have a proper relationship
        },
      })

      if (existingIncident) {
        return false
      }
    }

    // Create incident for high-risk events
    return event.riskScore > 0.7
  }

  private async createIncident(event: SecurityEvent): Promise<SecurityIncident> {
    const severity = this.mapEventSeverityToIncidentSeverity(event.severity)

    const incident = this.incidentRepository.create({
      title: `Security Incident - ${event.eventType}`,
      description: `Automated incident created for security event: ${event.description}`,
      severity,
      status: IncidentStatus.OPEN,
      detectedAt: event.createdAt,
      affectedSystems: this.identifyAffectedSystems(event),
      metadata: {
        triggerEventId: event.id,
        riskScore: event.riskScore,
        sourceIp: event.sourceIp,
        userId: event.userId,
      },
    })

    return this.incidentRepository.save(incident)
  }

  private async executeAutomatedResponse(event: SecurityEvent, incident: SecurityIncident): Promise<ResponseAction[]> {
    const actions: ResponseAction[] = []

    try {
      // IP-based responses
      if (event.sourceIp && event.riskScore > 0.8) {
        const blockAction: ResponseAction = {
          type: "block_ip",
          target: event.sourceIp,
          metadata: { reason: "High-risk security event", incidentId: incident.id },
        }

        await this.executeBlockIP(blockAction)
        actions.push(blockAction)
      }

      // User-based responses
      if (event.userId && event.riskScore > 0.9) {
        const disableAction: ResponseAction = {
          type: "disable_user",
          target: event.userId,
          metadata: { reason: "Critical security threat", incidentId: incident.id },
        }

        await this.executeDisableUser(disableAction)
        actions.push(disableAction)
      }

      // Admin notification for all incidents
      const alertAction: ResponseAction = {
        type: "alert_admin",
        target: "security-team",
        metadata: { incidentId: incident.id, severity: incident.severity },
      }

      await this.executeAlertAdmin(alertAction)
      actions.push(alertAction)

      // System isolation for critical threats
      if (event.riskScore > 0.95) {
        const isolateAction: ResponseAction = {
          type: "isolate_system",
          target: event.metadata?.systemId || "unknown",
          metadata: { reason: "Critical threat detected", incidentId: incident.id },
        }

        await this.executeIsolateSystem(isolateAction)
        actions.push(isolateAction)
      }
    } catch (error) {
      this.logger.error(`Failed to execute automated response: ${error.message}`, error.stack)
    }

    return actions
  }

  private async executeBlockIP(action: ResponseAction): Promise<void> {
    // Emit event for firewall/WAF integration
    this.eventEmitter.emit("security.response.block_ip", {
      ip: action.target,
      reason: action.metadata?.reason,
      duration: "24h", // Default block duration
    })

    this.logger.warn(`Blocked IP address: ${action.target}`)
  }

  private async executeDisableUser(action: ResponseAction): Promise<void> {
    // Emit event for user management system
    this.eventEmitter.emit("security.response.disable_user", {
      userId: action.target,
      reason: action.metadata?.reason,
    })

    this.logger.warn(`Disabled user account: ${action.target}`)
  }

  private async executeAlertAdmin(action: ResponseAction): Promise<void> {
    // Emit event for notification system
    this.eventEmitter.emit("security.response.alert_admin", {
      target: action.target,
      incidentId: action.metadata?.incidentId,
      severity: action.metadata?.severity,
      message: "Security incident requires immediate attention",
    })

    this.logger.log(`Admin alert sent for incident: ${action.metadata?.incidentId}`)
  }

  private async executeIsolateSystem(action: ResponseAction): Promise<void> {
    // Emit event for system isolation
    this.eventEmitter.emit("security.response.isolate_system", {
      systemId: action.target,
      reason: action.metadata?.reason,
    })

    this.logger.error(`System isolated: ${action.target}`)
  }

  private mapEventSeverityToIncidentSeverity(eventSeverity: string): IncidentSeverity {
    switch (eventSeverity) {
      case "critical":
        return IncidentSeverity.CRITICAL
      case "high":
        return IncidentSeverity.HIGH
      case "medium":
        return IncidentSeverity.MEDIUM
      default:
        return IncidentSeverity.LOW
    }
  }

  private identifyAffectedSystems(event: SecurityEvent): string[] {
    const systems: string[] = []

    if (event.resource) {
      systems.push(event.resource)
    }

    if (event.metadata?.systemId) {
      systems.push(event.metadata.systemId)
    }

    // Add default system if none identified
    if (systems.length === 0) {
      systems.push("web-application")
    }

    return systems
  }

  private async notifyStakeholders(incident: SecurityIncident): Promise<void> {
    // Determine notification recipients based on severity
    const recipients = this.getNotificationRecipients(incident.severity)

    this.eventEmitter.emit("security.incident.created", {
      incident,
      recipients,
    })
  }

  private getNotificationRecipients(severity: IncidentSeverity): string[] {
    switch (severity) {
      case IncidentSeverity.CRITICAL:
        return ["security-team", "ciso", "cto", "on-call-engineer"]
      case IncidentSeverity.HIGH:
        return ["security-team", "security-manager", "on-call-engineer"]
      case IncidentSeverity.MEDIUM:
        return ["security-team", "security-analyst"]
      default:
        return ["security-team"]
    }
  }

  async getIncidents(
    filters: {
      status?: IncidentStatus[]
      severity?: IncidentSeverity[]
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    } = {},
  ): Promise<{ incidents: SecurityIncident[]; total: number }> {
    const queryBuilder = this.incidentRepository.createQueryBuilder("incident")

    if (filters.status?.length) {
      queryBuilder.andWhere("incident.status IN (:...status)", {
        status: filters.status,
      })
    }

    if (filters.severity?.length) {
      queryBuilder.andWhere("incident.severity IN (:...severity)", {
        severity: filters.severity,
      })
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere("incident.createdAt BETWEEN :startDate AND :endDate", {
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    }

    queryBuilder.orderBy("incident.createdAt", "DESC")

    if (filters.limit) {
      queryBuilder.limit(filters.limit)
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset)
    }

    const [incidents, total] = await queryBuilder.getManyAndCount()

    return { incidents, total }
  }

  async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    assignedTo?: string,
  ): Promise<SecurityIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    })

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`)
    }

    incident.status = status
    if (assignedTo) {
      incident.assignedTo = assignedTo
    }

    if (status === IncidentStatus.RESOLVED || status === IncidentStatus.CLOSED) {
      incident.resolvedAt = new Date()
    }

    return this.incidentRepository.save(incident)
  }
}
