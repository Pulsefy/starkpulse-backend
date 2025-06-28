import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../auth/entities/user.entity';

export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  WALLET_CONNECT = 'wallet_connect',
  WALLET_DISCONNECT = 'wallet_disconnect',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_VIOLATION = 'csrf_violation',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  API_ABUSE = 'api_abuse',
  DATA_EXFILTRATION_ATTEMPT = 'data_exfiltration_attempt',
  MALWARE_DETECTED = 'malware_detected',
  CONFIGURATION_CHANGE = 'configuration_change',
  USER_PERMISSION_CHANGE = 'user_permission_change',
  SYSTEM_BREACH_ATTEMPT = 'system_breach_attempt',
}

export enum SecurityEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SecurityEventStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  ESCALATED = 'escalated',
}

@Entity('security_events')
@Index(['userId', 'createdAt'])
@Index(['eventType', 'severity'])
@Index(['ipAddress', 'createdAt'])
@Index(['status', 'createdAt'])
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SecurityEventType,
  })
  eventType: SecurityEventType;

  @Column({
    type: 'enum',
    enum: SecurityEventSeverity,
    default: SecurityEventSeverity.LOW,
  })
  severity: SecurityEventSeverity;

  @Column({
    type: 'enum',
    enum: SecurityEventStatus,
    default: SecurityEventStatus.PENDING,
  })
  status: SecurityEventStatus;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  requestId?: string;

  @Column({ nullable: true })
  endpoint?: string;

  @Column({ nullable: true })
  method?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @Column({ nullable: true })
  source?: string;

  @Column({ nullable: true })
  threatScore?: number;

  @Column({ type: 'jsonb', nullable: true })
  indicators?: string[];

  @Column({ nullable: true })
  investigationNotes?: string;

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ nullable: true })
  resolutionNotes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  resolvedAt?: Date;
} 