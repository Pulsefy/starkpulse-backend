import { Injectable, Logger } from "@nestjs/common"
import { type Repository, Between, In } from "typeorm"
import type { EventEmitter2 } from "@nestjs/event-emitter"
import {
  type SecurityEvent,
  type SecurityEventType,
  SecurityEventSeverity,
} from "../common/security/entities/security-event.entity"
import type { ThreatDetectionService } from "./threat-detection.service"
import type { IncidentResponseService } from "./incident-response.service"

export interface SecurityEventData {
  eventType: SecurityEventType
  description: string
  sourceIp?: string
  userAgent?: string
  userId?: string
  resource?: string
  action?: string
  metadata?: Record<string, any>
}

@Injectable()
export class SiemService {
  private readonly logger = new Logger(SiemService.name)

  constructor(
    private securityEventRepository: Repository<SecurityEvent>,
    private threatDetectionService: ThreatDetectionService,
    private incidentResponseService: IncidentResponseService,
    private eventEmitter: EventEmitter2,
  ) {}

  async collectSecurityEvent(eventData: SecurityEventData): Promise<SecurityEvent> {
    try {
      // Create security event
      const securityEvent = this.securityEventRepository.create({
        ...eventData,
        createdAt: new Date(),
      })

      // Perform threat analysis
      const threatAnalysis = await this.threatDetectionService.analyzeEvent(securityEvent)

      securityEvent.isThreat = threatAnalysis.isThreat
      securityEvent.riskScore = threatAnalysis.riskScore
      securityEvent.severity = this.calculateSeverity(threatAnalysis.riskScore)

      // Save event
      const savedEvent = await this.securityEventRepository.save(securityEvent)

      // Emit event for real-time processing
      this.eventEmitter.emit("security.event.created", savedEvent)

      // Trigger incident response if threat detected
      if (threatAnalysis.isThreat && threatAnalysis.riskScore > 0.7) {
        await this.incidentResponseService.handleThreatEvent(savedEvent)
      }

      this.logger.log(`Security event collected: ${eventData.eventType} - Risk Score: ${threatAnalysis.riskScore}`)

      return savedEvent
    } catch (error) {
      this.logger.error(`Failed to collect security event: ${error.message}`, error.stack)
      throw error
    }
  }

  async getSecurityEvents(
    filters: {
      startDate?: Date
      endDate?: Date
      eventTypes?: SecurityEventType[]
      severity?: SecurityEventSeverity[]
      isThreat?: boolean
      limit?: number
      offset?: number
    } = {},
  ): Promise<{ events: SecurityEvent[]; total: number }> {
    const queryBuilder = this.securityEventRepository.createQueryBuilder("event")

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere("event.createdAt BETWEEN :startDate AND :endDate", {
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
    }

    if (filters.eventTypes?.length) {
      queryBuilder.andWhere("event.eventType IN (:...eventTypes)", {
        eventTypes: filters.eventTypes,
      })
    }

    if (filters.severity?.length) {
      queryBuilder.andWhere("event.severity IN (:...severity)", {
        severity: filters.severity,
      })
    }

    if (filters.isThreat !== undefined) {
      queryBuilder.andWhere("event.isThreat = :isThreat", {
        isThreat: filters.isThreat,
      })
    }

    queryBuilder.orderBy("event.createdAt", "DESC")

    if (filters.limit) {
      queryBuilder.limit(filters.limit)
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset)
    }

    const [events, total] = await queryBuilder.getManyAndCount()

    return { events, total }
  }

  async getSecurityMetrics(timeRange: { start: Date; end: Date }) {
    const events = await this.securityEventRepository.find({
      where: {
        createdAt: Between(timeRange.start, timeRange.end),
      },
    })

    const metrics = {
      totalEvents: events.length,
      threatEvents: events.filter((e) => e.isThreat).length,
      eventsByType: this.groupEventsByType(events),
      eventsBySeverity: this.groupEventsBySeverity(events),
      averageRiskScore: this.calculateAverageRiskScore(events),
      topSourceIPs: this.getTopSourceIPs(events),
      timelineData: this.generateTimelineData(events, timeRange),
    }

    return metrics
  }

  async correlateEvents(timeWindow = 300000): Promise<string[]> {
    // Get recent events within time window (default 5 minutes)
    const cutoffTime = new Date(Date.now() - timeWindow)
    const recentEvents = await this.securityEventRepository.find({
      where: {
        createdAt: Between(cutoffTime, new Date()),
      },
      order: {
        createdAt: "DESC",
      },
    })

    const correlationGroups: string[] = []

    // Group events by source IP and user
    const eventGroups = this.groupEventsForCorrelation(recentEvents)

    for (const [key, events] of eventGroups.entries()) {
      if (events.length >= 3) {
        // Threshold for correlation
        const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Update events with correlation ID
        await this.securityEventRepository.update({ id: In(events.map((e) => e.id)) }, { correlationId })

        correlationGroups.push(correlationId)

        this.logger.warn(`Correlated events detected: ${key} - ${events.length} events`)
      }
    }

    return correlationGroups
  }

  private calculateSeverity(riskScore: number): SecurityEventSeverity {
    if (riskScore >= 0.8) return SecurityEventSeverity.CRITICAL
    if (riskScore >= 0.6) return SecurityEventSeverity.HIGH
    if (riskScore >= 0.3) return SecurityEventSeverity.MEDIUM
    return SecurityEventSeverity.LOW
  }

  private groupEventsByType(events: SecurityEvent[]) {
    return events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }

  private groupEventsBySeverity(events: SecurityEvent[]) {
    return events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }

  private calculateAverageRiskScore(events: SecurityEvent[]): number {
    if (events.length === 0) return 0
    const totalScore = events.reduce((sum, event) => sum + event.riskScore, 0)
    return totalScore / events.length
  }

  private getTopSourceIPs(events: SecurityEvent[], limit = 10) {
    const ipCounts = events.reduce(
      (acc, event) => {
        if (event.sourceIp) {
          acc[event.sourceIp] = (acc[event.sourceIp] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([ip, count]) => ({ ip, count }))
  }

  private generateTimelineData(events: SecurityEvent[], timeRange: { start: Date; end: Date }) {
    const hourlyData: Record<string, number> = {}
    const hoursDiff = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60))

    // Initialize all hours with 0
    for (let i = 0; i < hoursDiff; i++) {
      const hour = new Date(timeRange.start.getTime() + i * 60 * 60 * 1000)
      const hourKey = hour.toISOString().slice(0, 13)
      hourlyData[hourKey] = 0
    }

    // Count events per hour
    events.forEach((event) => {
      const hourKey = event.createdAt.toISOString().slice(0, 13)
      if (hourlyData.hasOwnProperty(hourKey)) {
        hourlyData[hourKey]++
      }
    })

    return Object.entries(hourlyData).map(([hour, count]) => ({
      timestamp: hour,
      count,
    }))
  }

  private groupEventsForCorrelation(events: SecurityEvent[]): Map<string, SecurityEvent[]> {
    const groups = new Map<string, SecurityEvent[]>()

    events.forEach((event) => {
      // Group by source IP
      if (event.sourceIp) {
        const key = `ip_${event.sourceIp}`
        if (!groups.has(key)) {
          groups.set(key, [])
        }
        groups.get(key)!.push(event)
      }

      // Group by user ID
      if (event.userId) {
        const key = `user_${event.userId}`
        if (!groups.has(key)) {
          groups.set(key, [])
        }
        groups.get(key)!.push(event)
      }
    })

    return groups
  }
}
