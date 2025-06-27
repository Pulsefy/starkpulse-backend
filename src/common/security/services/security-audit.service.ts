import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '../../../config/config.service';
import { SecurityEvent, SecurityEventType, SecurityEventSeverity, SecurityEventStatus } from '../entities/security-event.entity';
import { SecurityAnomaly, AnomalyType, AnomalyStatus } from '../entities/security-anomaly.entity';
import { SecurityThreat, ThreatType, ThreatStatus, ThreatSeverity } from '../entities/security-threat.entity';
import { CreateSecurityEventDto, UpdateSecurityEventDto, SecurityEventQueryDto } from '../dto/security-event.dto';
import { CreateSecurityAnomalyDto, UpdateSecurityAnomalyDto, SecurityAnomalyQueryDto } from '../dto/security-anomaly.dto';
import { CreateSecurityThreatDto, UpdateSecurityThreatDto, SecurityThreatQueryDto } from '../dto/security-threat.dto';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { ThreatIntelligenceService } from './threat-intelligence.service';
import { SecurityMetricsService } from './security-metrics.service';

export interface SecurityEventContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
    @InjectRepository(SecurityAnomaly)
    private readonly securityAnomalyRepository: Repository<SecurityAnomaly>,
    @InjectRepository(SecurityThreat)
    private readonly securityThreatRepository: Repository<SecurityThreat>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
    private readonly threatIntelligenceService: ThreatIntelligenceService,
    private readonly securityMetricsService: SecurityMetricsService,
  ) {}

  /**
   * Log a security event
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    context: SecurityEventContext,
    severity: SecurityEventSeverity = SecurityEventSeverity.LOW,
    description?: string,
  ): Promise<SecurityEvent> {
    try {
      const event = this.securityEventRepository.create({
        eventType,
        severity,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId,
        requestId: context.requestId,
        endpoint: context.endpoint,
        method: context.method,
        metadata: context.metadata,
        context: context.context,
        description,
        source: 'security_audit_service',
      });

      const savedEvent = await this.securityEventRepository.save(event);

      // Emit event for real-time processing
      this.eventEmitter.emit('security.event.logged', savedEvent);

      // Trigger anomaly detection
      await this.triggerAnomalyDetection(savedEvent);

      // Update metrics
      await this.securityMetricsService.updateEventMetrics(savedEvent);

      this.logger.log(`Security event logged: ${eventType} for user ${context.userId || 'anonymous'}`);

      return savedEvent;
    } catch (error) {
      this.logger.error('Failed to log security event', error);
      throw error;
    }
  }

  /**
   * Create a security event manually
   */
  async createSecurityEvent(createDto: CreateSecurityEventDto): Promise<SecurityEvent> {
    const event = this.securityEventRepository.create(createDto);
    return await this.securityEventRepository.save(event);
  }

  /**
   * Update a security event
   */
  async updateSecurityEvent(id: string, updateDto: UpdateSecurityEventDto): Promise<SecurityEvent> {
    const event = await this.securityEventRepository.findOne({ where: { id } });
    if (!event) {
      throw new Error(`Security event with ID ${id} not found`);
    }

    Object.assign(event, updateDto);
    if (updateDto.resolvedAt) {
      event.resolvedAt = new Date(updateDto.resolvedAt);
    }

    return await this.securityEventRepository.save(event);
  }

  /**
   * Query security events
   */
  async querySecurityEvents(query: SecurityEventQueryDto): Promise<{ data: SecurityEvent[]; total: number }> {
    const qb = this.securityEventRepository.createQueryBuilder('event');

    if (query.userId) {
      qb.andWhere('event.userId = :userId', { userId: query.userId });
    }

    if (query.eventType) {
      qb.andWhere('event.eventType = :eventType', { eventType: query.eventType });
    }

    if (query.severity) {
      qb.andWhere('event.severity = :severity', { severity: query.severity });
    }

    if (query.status) {
      qb.andWhere('event.status = :status', { status: query.status });
    }

    if (query.ipAddress) {
      qb.andWhere('event.ipAddress = :ipAddress', { ipAddress: query.ipAddress });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('event.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    const total = await qb.getCount();

    qb.orderBy('event.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 50);

    const data = await qb.getMany();

    return { data, total };
  }

  /**
   * Create a security anomaly
   */
  async createSecurityAnomaly(createDto: CreateSecurityAnomalyDto): Promise<SecurityAnomaly> {
    const anomaly = this.securityAnomalyRepository.create(createDto);
    const savedAnomaly = await this.securityAnomalyRepository.save(anomaly);

    // Emit event for real-time processing
    this.eventEmitter.emit('security.anomaly.detected', savedAnomaly);

    // Trigger threat intelligence analysis
    await this.triggerThreatIntelligence(savedAnomaly);

    return savedAnomaly;
  }

  /**
   * Update a security anomaly
   */
  async updateSecurityAnomaly(id: string, updateDto: UpdateSecurityAnomalyDto): Promise<SecurityAnomaly> {
    const anomaly = await this.securityAnomalyRepository.findOne({ where: { id } });
    if (!anomaly) {
      throw new Error(`Security anomaly with ID ${id} not found`);
    }

    Object.assign(anomaly, updateDto);
    if (updateDto.resolvedAt) {
      anomaly.resolvedAt = new Date(updateDto.resolvedAt);
    }

    return await this.securityAnomalyRepository.save(anomaly);
  }

  /**
   * Query security anomalies
   */
  async querySecurityAnomalies(query: SecurityAnomalyQueryDto): Promise<{ data: SecurityAnomaly[]; total: number }> {
    const qb = this.securityAnomalyRepository.createQueryBuilder('anomaly');

    if (query.userId) {
      qb.andWhere('anomaly.userId = :userId', { userId: query.userId });
    }

    if (query.anomalyType) {
      qb.andWhere('anomaly.anomalyType = :anomalyType', { anomalyType: query.anomalyType });
    }

    if (query.status) {
      qb.andWhere('anomaly.status = :status', { status: query.status });
    }

    if (query.ipAddress) {
      qb.andWhere('anomaly.ipAddress = :ipAddress', { ipAddress: query.ipAddress });
    }

    if (query.minConfidence) {
      qb.andWhere('anomaly.confidence >= :minConfidence', { minConfidence: query.minConfidence });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('anomaly.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    const total = await qb.getCount();

    qb.orderBy('anomaly.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 50);

    const data = await qb.getMany();

    return { data, total };
  }

  /**
   * Create a security threat
   */
  async createSecurityThreat(createDto: CreateSecurityThreatDto): Promise<SecurityThreat> {
    const threat = this.securityThreatRepository.create(createDto);
    const savedThreat = await this.securityThreatRepository.save(threat);

    // Emit event for real-time processing
    this.eventEmitter.emit('security.threat.detected', savedThreat);

    // Trigger automated response
    await this.triggerAutomatedResponse(savedThreat);

    return savedThreat;
  }

  /**
   * Update a security threat
   */
  async updateSecurityThreat(id: string, updateDto: UpdateSecurityThreatDto): Promise<SecurityThreat> {
    const threat = await this.securityThreatRepository.findOne({ where: { id } });
    if (!threat) {
      throw new Error(`Security threat with ID ${id} not found`);
    }

    Object.assign(threat, updateDto);
    if (updateDto.resolvedAt) {
      threat.resolvedAt = new Date(updateDto.resolvedAt);
    }
    if (updateDto.mitigatedAt) {
      threat.mitigatedAt = new Date(updateDto.mitigatedAt);
    }

    return await this.securityThreatRepository.save(threat);
  }

  /**
   * Query security threats
   */
  async querySecurityThreats(query: SecurityThreatQueryDto): Promise<{ data: SecurityThreat[]; total: number }> {
    const qb = this.securityThreatRepository.createQueryBuilder('threat');

    if (query.userId) {
      qb.andWhere('threat.userId = :userId', { userId: query.userId });
    }

    if (query.threatType) {
      qb.andWhere('threat.threatType = :threatType', { threatType: query.threatType });
    }

    if (query.status) {
      qb.andWhere('threat.status = :status', { status: query.status });
    }

    if (query.severity) {
      qb.andWhere('threat.severity = :severity', { severity: query.severity });
    }

    if (query.ipAddress) {
      qb.andWhere('threat.ipAddress = :ipAddress', { ipAddress: query.ipAddress });
    }

    if (query.minThreatScore) {
      qb.andWhere('threat.threatScore >= :minThreatScore', { minThreatScore: query.minThreatScore });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('threat.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    }

    const total = await qb.getCount();

    qb.orderBy('threat.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 50);

    const data = await qb.getMany();

    return { data, total };
  }

  /**
   * Get security dashboard metrics
   */
  async getSecurityDashboardMetrics(): Promise<any> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      eventsLast24h,
      eventsLast7d,
      totalAnomalies,
      anomaliesLast24h,
      totalThreats,
      threatsLast24h,
      criticalThreats,
      pendingEvents,
      pendingAnomalies,
      pendingThreats,
    ] = await Promise.all([
      this.securityEventRepository.count(),
      this.securityEventRepository.count({ where: { createdAt: MoreThanOrEqual(last24Hours) } }),
      this.securityEventRepository.count({ where: { createdAt: MoreThanOrEqual(last7Days) } }),
      this.securityAnomalyRepository.count(),
      this.securityAnomalyRepository.count({ where: { createdAt: MoreThanOrEqual(last24Hours) } }),
      this.securityThreatRepository.count(),
      this.securityThreatRepository.count({ where: { createdAt: MoreThanOrEqual(last24Hours) } }),
      this.securityThreatRepository.count({ where: { severity: ThreatSeverity.CRITICAL } }),
      this.securityEventRepository.count({ where: { status: SecurityEventStatus.PENDING } }),
      this.securityAnomalyRepository.count({ where: { status: AnomalyStatus.DETECTED } }),
      this.securityThreatRepository.count({ where: { status: ThreatStatus.DETECTED } }),
    ]);

    return {
      events: {
        total: totalEvents,
        last24h: eventsLast24h,
        last7d: eventsLast7d,
        pending: pendingEvents,
      },
      anomalies: {
        total: totalAnomalies,
        last24h: anomaliesLast24h,
        pending: pendingAnomalies,
      },
      threats: {
        total: totalThreats,
        last24h: threatsLast24h,
        critical: criticalThreats,
        pending: pendingThreats,
      },
      riskScore: await this.calculateOverallRiskScore(),
    };
  }

  /**
   * Calculate overall risk score
   */
  private async calculateOverallRiskScore(): Promise<number> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      criticalEvents,
      highEvents,
      mediumEvents,
      criticalThreats,
      highThreats,
      anomalies,
    ] = await Promise.all([
      this.securityEventRepository.count({
        where: {
          severity: SecurityEventSeverity.CRITICAL,
          createdAt: MoreThanOrEqual(last24Hours),
        },
      }),
      this.securityEventRepository.count({
        where: {
          severity: SecurityEventSeverity.HIGH,
          createdAt: MoreThanOrEqual(last24Hours),
        },
      }),
      this.securityEventRepository.count({
        where: {
          severity: SecurityEventSeverity.MEDIUM,
          createdAt: MoreThanOrEqual(last24Hours),
        },
      }),
      this.securityThreatRepository.count({
        where: {
          severity: ThreatSeverity.CRITICAL,
          createdAt: MoreThanOrEqual(last24Hours),
        },
      }),
      this.securityThreatRepository.count({
        where: {
          severity: ThreatSeverity.HIGH,
          createdAt: MoreThanOrEqual(last24Hours),
        },
      }),
      this.securityAnomalyRepository.count({
        where: {
          createdAt: MoreThanOrEqual(last24Hours),
        },
      }),
    ]);

    // Calculate weighted risk score (0-100)
    const riskScore = Math.min(
      100,
      criticalEvents * 20 + highEvents * 10 + mediumEvents * 5 + criticalThreats * 25 + highThreats * 15 + anomalies * 2,
    );

    return Math.round(riskScore);
  }

  /**
   * Trigger anomaly detection for a security event
   */
  private async triggerAnomalyDetection(event: SecurityEvent): Promise<void> {
    try {
      const anomalies = await this.anomalyDetectionService.detectAnomalies(event);
      
      for (const anomaly of anomalies) {
        await this.createSecurityAnomaly({
          anomalyType: anomaly.type,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          confidence: anomaly.confidence,
          baselineData: anomaly.baselineData,
          anomalyData: anomaly.anomalyData,
          context: anomaly.context,
          description: anomaly.description,
          threatScore: anomaly.threatScore,
        });
      }
    } catch (error) {
      this.logger.error('Failed to trigger anomaly detection', error);
    }
  }

  /**
   * Trigger threat intelligence analysis for an anomaly
   */
  private async triggerThreatIntelligence(anomaly: SecurityAnomaly): Promise<void> {
    try {
      const threatData = await this.threatIntelligenceService.analyzeAnomaly(anomaly);
      
      if (threatData.isThreat) {
        await this.createSecurityThreat({
          threatType: threatData.threatType,
          severity: threatData.severity,
          userId: anomaly.userId,
          ipAddress: anomaly.ipAddress,
          userAgent: anomaly.userAgent,
          description: threatData.description,
          indicators: threatData.indicators,
          context: threatData.context,
          evidence: threatData.evidence,
          threatScore: threatData.threatScore,
          confidence: threatData.confidence,
          relatedAnomalies: [anomaly.id],
        });
      }
    } catch (error) {
      this.logger.error('Failed to trigger threat intelligence analysis', error);
    }
  }

  /**
   * Trigger automated response for a threat
   */
  private async triggerAutomatedResponse(threat: SecurityThreat): Promise<void> {
    try {
      // Implement automated response logic based on threat type and severity
      this.logger.log(`Automated response triggered for threat: ${threat.threatType} (${threat.severity})`);
      
      // Emit event for automated response handlers
      this.eventEmitter.emit('security.threat.automated_response', threat);
    } catch (error) {
      this.logger.error('Failed to trigger automated response', error);
    }
  }
} 