import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum SecurityEventType {
  LOGIN_ATTEMPT = "login_attempt",
  LOGIN_SUCCESS = "login_success",
  LOGIN_FAILURE = "login_failure",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  DATA_ACCESS = "data_access",
  DATA_MODIFICATION = "data_modification",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  MALWARE_DETECTION = "malware_detection",
  NETWORK_INTRUSION = "network_intrusion",
  POLICY_VIOLATION = "policy_violation",
  SYSTEM_ANOMALY = "system_anomaly",
}

export enum SecurityEventSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum SecurityEventStatus {
  NEW = "new",
  INVESTIGATING = "investigating",
  RESOLVED = "resolved",
  FALSE_POSITIVE = "false_positive",
}

@Entity("security_events")
@Index(["eventType", "createdAt"])
@Index(["severity", "status"])
@Index(["sourceIp"])
@Index(["userId"])
export class SecurityEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: SecurityEventType,
  })
  eventType: SecurityEventType

  @Column({
    type: "enum",
    enum: SecurityEventSeverity,
    default: SecurityEventSeverity.LOW,
  })
  severity: SecurityEventSeverity

  @Column({
    type: "enum",
    enum: SecurityEventStatus,
    default: SecurityEventStatus.NEW,
  })
  status: SecurityEventStatus

  @Column({ type: "varchar", length: 500 })
  description: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "varchar", length: 45, nullable: true })
  sourceIp: string

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string

  @Column({ type: "uuid", nullable: true })
  userId: string

  @Column({ type: "varchar", length: 255, nullable: true })
  resource: string

  @Column({ type: "varchar", length: 100, nullable: true })
  action: string

  @Column({ type: "boolean", default: false })
  isThreat: boolean

  @Column({ type: "float", default: 0 })
  riskScore: number

  @Column({ type: "varchar", length: 255, nullable: true })
  correlationId: string

  @Column({ type: "jsonb", nullable: true })
  responseActions: string[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
