import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type SecurityEvent, SecurityEventType } from "../common/security/entities/security-event.entity"
import type { ThreatIntelligence } from "./threat-intelligence.entity"
import type  {ThreatType } from "./threat-intelligence.entity"

export interface ThreatAnalysisResult {
  isThreat: boolean
  riskScore: number
  reasons: string[]
  recommendations: string[]
}

@Injectable()
export class ThreatDetectionService {
  private readonly logger = new Logger(ThreatDetectionService.name)

  // Threat detection rules and patterns
  private readonly suspiciousPatterns = {
    sqlInjection:
      /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|where|order|group)\b)|('.*'.*=.*')|(\d+.*=.*\d+)/i,
    xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    pathTraversal: /(\.\.[/\\]){2,}/,
    commandInjection: /[;&|`$(){}[\]]/,
  }

  private readonly riskFactors = {
    [SecurityEventType.LOGIN_FAILURE]: 0.3,
    [SecurityEventType.UNAUTHORIZED_ACCESS]: 0.8,
    [SecurityEventType.PRIVILEGE_ESCALATION]: 0.9,
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: 0.6,
    [SecurityEventType.MALWARE_DETECTION]: 1.0,
    [SecurityEventType.NETWORK_INTRUSION]: 0.9,
    [SecurityEventType.POLICY_VIOLATION]: 0.4,
    [SecurityEventType.SYSTEM_ANOMALY]: 0.5,
  }

  private threatIntelligenceRepository: Repository<ThreatIntelligence>
  private securityEventRepository: Repository<SecurityEvent>

  constructor(
    threatIntelligenceRepository: Repository<ThreatIntelligence>,
    securityEventRepository: Repository<SecurityEvent>,
  ) {
    this.threatIntelligenceRepository = threatIntelligenceRepository
    this.securityEventRepository = securityEventRepository
  }

  async analyzeEvent(event: SecurityEvent): Promise<ThreatAnalysisResult> {
    const reasons: string[] = []
    const recommendations: string[] = []
    let riskScore = 0

    // Base risk score from event type
    const baseRisk = this.riskFactors[event.eventType] || 0.1
    riskScore += baseRisk

    if (baseRisk > 0.5) {
      reasons.push(`High-risk event type: ${event.eventType}`)
    }

    // Check against threat intelligence
    const threatIntelMatch = await this.checkThreatIntelligence(event)
    if (threatIntelMatch) {
      riskScore += 0.4
      reasons.push(`Matches threat intelligence: ${threatIntelMatch.description}`)
      recommendations.push("Block source IP immediately")
    }

    // Pattern-based detection
    const patternMatch = this.detectSuspiciousPatterns(event)
    if (patternMatch.detected) {
      riskScore += 0.3
      reasons.push(`Suspicious pattern detected: ${patternMatch.pattern}`)
      recommendations.push("Investigate request payload")
    }

    // Behavioral analysis
    const behaviorAnalysis = await this.analyzeBehavior(event)
    riskScore += behaviorAnalysis.riskIncrease
    reasons.push(...behaviorAnalysis.reasons)
    recommendations.push(...behaviorAnalysis.recommendations)

    // Frequency analysis
    const frequencyAnalysis = await this.analyzeFrequency(event)
    riskScore += frequencyAnalysis.riskIncrease
    reasons.push(...frequencyAnalysis.reasons)
    recommendations.push(...frequencyAnalysis.recommendations)

    // Geolocation analysis
    const geoAnalysis = await this.analyzeGeolocation(event)
    riskScore += geoAnalysis.riskIncrease
    reasons.push(...geoAnalysis.reasons)
    recommendations.push(...geoAnalysis.recommendations)

    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0)

    const isThreat = riskScore > 0.5

    this.logger.debug(`Threat analysis for event ${event.id}: Risk Score ${riskScore}, Is Threat: ${isThreat}`)

    return {
      isThreat,
      riskScore,
      reasons,
      recommendations,
    }
  }

  private async checkThreatIntelligence(event: SecurityEvent): Promise<ThreatIntelligence | null> {
    const indicators: string[] = []

    if (event.sourceIp) {
      indicators.push(event.sourceIp)
    }

    if (event.metadata?.payload) {
      indicators.push(event.metadata.payload)
    }

    if (indicators.length === 0) {
      return null
    }

    const threatMatch = await this.threatIntelligenceRepository.findOne({
      where: {
        indicator: indicators[0], // Simplified - in production, check all indicators
        isActive: true,
      },
    })

    return threatMatch
  }

  private detectSuspiciousPatterns(event: SecurityEvent): { detected: boolean; pattern?: string } {
    const payload = event.metadata?.payload || event.description

    for (const [patternName, regex] of Object.entries(this.suspiciousPatterns)) {
      if (regex.test(payload)) {
        return { detected: true, pattern: patternName }
      }
    }

    return { detected: false }
  }

  private async analyzeBehavior(event: SecurityEvent): Promise<{
    riskIncrease: number
    reasons: string[]
    recommendations: string[]
  }> {
    const reasons: string[] = []
    const recommendations: string[] = []
    let riskIncrease = 0

    // Check for unusual time patterns
    const hour = event.createdAt.getHours()
    if (hour < 6 || hour > 22) {
      riskIncrease += 0.1
      reasons.push("Activity during unusual hours")
      recommendations.push("Verify user identity")
    }

    // Check for privilege escalation attempts
    if (event.eventType === SecurityEventType.PRIVILEGE_ESCALATION) {
      riskIncrease += 0.3
      reasons.push("Privilege escalation attempt detected")
      recommendations.push("Review user permissions immediately")
    }

    // Check for multiple failed attempts
    if (event.eventType === SecurityEventType.LOGIN_FAILURE && event.userId) {
      const recentFailures = await this.securityEventRepository.count({
        where: {
          userId: event.userId,
          eventType: SecurityEventType.LOGIN_FAILURE,
          createdAt: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        },
      })

      if (recentFailures >= 3) {
        riskIncrease += 0.4
        reasons.push(`Multiple login failures: ${recentFailures} attempts`)
        recommendations.push("Consider account lockout")
      }
    }

    return { riskIncrease, reasons, recommendations }
  }

  private async analyzeFrequency(event: SecurityEvent): Promise<{
    riskIncrease: number
    reasons: string[]
    recommendations: string[]
  }> {
    const reasons: string[] = []
    const recommendations: string[] = []
    let riskIncrease = 0

    if (!event.sourceIp) {
      return { riskIncrease, reasons, recommendations }
    }

    // Check request frequency from same IP
    const recentEvents = await this.securityEventRepository.count({
      where: {
        sourceIp: event.sourceIp,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      },
    })

    if (recentEvents > 50) {
      riskIncrease += 0.5
      reasons.push(`High frequency requests: ${recentEvents} in 5 minutes`)
      recommendations.push("Implement rate limiting")
    } else if (recentEvents > 20) {
      riskIncrease += 0.2
      reasons.push(`Elevated request frequency: ${recentEvents} in 5 minutes`)
      recommendations.push("Monitor closely")
    }

    return { riskIncrease, reasons, recommendations }
  }

  private async analyzeGeolocation(event: SecurityEvent): Promise<{
    riskIncrease: number
    reasons: string[]
    recommendations: string[]
  }> {
    const reasons: string[] = []
    const recommendations: string[] = []
    let riskIncrease = 0

    // Simplified geolocation analysis
    // In production, you would integrate with a geolocation service
    if (event.sourceIp && event.userId) {
      // Check for impossible travel (simplified)
      const recentUserEvents = await this.securityEventRepository.find({
        where: {
          userId: event.userId,
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
        order: {
          createdAt: "DESC",
        },
        take: 5,
      })

      const uniqueIPs = new Set(recentUserEvents.map((e) => e.sourceIp).filter(Boolean))

      if (uniqueIPs.size > 3) {
        riskIncrease += 0.3
        reasons.push(`Multiple IP addresses used: ${uniqueIPs.size} different IPs`)
        recommendations.push("Verify user location and device")
      }
    }

    return { riskIncrease, reasons, recommendations }
  }

  async updateThreatIntelligence(
    indicators: {
      threatType: ThreatType
      indicator: string
      description?: string
      confidence: number
      source?: string
      expiresAt?: Date
    }[],
  ): Promise<void> {
    for (const indicator of indicators) {
      await this.threatIntelligenceRepository.save(this.threatIntelligenceRepository.create(indicator))
    }

    this.logger.log(`Updated threat intelligence with ${indicators.length} indicators`)
  }

  async getActiveThreatIntelligence(): Promise<ThreatIntelligence[]> {
    return this.threatIntelligenceRepository.find({
      where: {
        isActive: true,
      },
      order: {
        createdAt: "DESC",
      },
    })
  }
}
