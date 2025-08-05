import { Controller } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import type { SiemService, SecurityEventData } from "./siem.service"
import type { ThreatDetectionService, } from "./threat-detection.service"
import type { IncidentResponseService } from "./incident-response.service"
import type { AlertingService } from "src/seis-monitoring/alerting.service"
import type { SecurityEventType, SecurityEventSeverity } from "../common/security/entities/security-event.entity"
import  {  IncidentSeverity } from "./security-incident.entity"
import type { SecurityEventStatus } from "../common/security/entities/security-event.entity"
import type { IncidentStatus } from "./security-incident.entity"
import type { ThreatType } from "./threat-intelligence.entity"
@ApiTags("Security")
@Controller("security")
// @UseGuards(AuthGuard) // Add your authentication guard
export class SecurityController {
  constructor(
    private siemService: SiemService,
    private threatDetectionService: ThreatDetectionService,
    private incidentResponseService: IncidentResponseService,
    private alertingService: AlertingService,
  ) {}

  collectSecurityEvent(eventData: SecurityEventData) {
    return this.siemService.collectSecurityEvent(eventData)
  }

  getSecurityEvents(
    startDate?: string,
    endDate?: string,
    eventTypes?: string,
    severity?: string,
    isThreat?: boolean,
    limit?: number,
    offset?: number,
  ) {
    const filters: any = {}

    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    if (eventTypes) filters.eventTypes = eventTypes.split(",") as SecurityEventType[]
    if (severity) filters.severity = severity.split(",") as SecurityEventSeverity[]
    if (isThreat !== undefined) filters.isThreat = isThreat
    if (limit) filters.limit = Number.parseInt(limit.toString())
    if (offset) filters.offset = Number.parseInt(offset.toString())

    return this.siemService.getSecurityEvents(filters)
  }

  getSecurityMetrics(startDate: string, endDate: string) {
    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    }

    return this.siemService.getSecurityMetrics(timeRange)
  }

  correlateEvents(timeWindow?: number) {
    return this.siemService.correlateEvents(timeWindow)
  }

  getIncidents(
    status?: string,
    severity?: string,
    startDate?: string,
    endDate?: string,
    limit?: number,
    offset?: number,
  ) {
    const filters: any = {}

    if (status) filters.status = status.split(",") as IncidentStatus[]
    if (severity) filters.severity = severity.split(",") as IncidentSeverity[]
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    if (limit) filters.limit = Number.parseInt(limit.toString())
    if (offset) filters.offset = Number.parseInt(offset.toString())

    return this.incidentResponseService.getIncidents(filters)
  }

  updateIncidentStatus(id: string, updateData: { status: IncidentStatus; assignedTo?: string }) {
    return this.incidentResponseService.updateIncidentStatus(id, updateData.status, updateData.assignedTo)
  }

  updateThreatIntelligence(
    indicators: Array<{
      threatType: ThreatType
      indicator: string
      description?: string
      confidence: number
      source?: string
      expiresAt?: Date
    }>,
  ) {
    return this.threatDetectionService.updateThreatIntelligence(indicators)
  }

  getThreatIntelligence() {
    return this.threatDetectionService.getActiveThreatIntelligence()
  }

  getAlertRules() {
    return this.alertingService.getAlertRules()
  }

  addAlertRule(rule: any) {
    return this.alertingService.addAlertRule(rule)
  }

  updateAlertRule(id: string, updates: any) {
    return this.alertingService.updateAlertRule(id, updates)
  }

  async getDashboardData(timeRange = "24h") {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case "1h":
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    const [metrics, incidents, threatIntel] = await Promise.all([
      this.siemService.getSecurityMetrics({ start: startDate, end: now }),
      this.incidentResponseService.getIncidents({
        startDate,
        endDate: now,
        limit: 10,
      }),
      this.threatDetectionService.getActiveThreatIntelligence(),
    ])

    return {
      metrics,
      recentIncidents: incidents.incidents,
      threatIntelligenceCount: threatIntel.length,
      timeRange,
      lastUpdated: now,
    }
  }
}
