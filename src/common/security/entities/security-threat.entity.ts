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

export enum ThreatType {
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  DDoS_ATTACK = 'ddos_attack',
  MALWARE_INFECTION = 'malware_infection',
  PHISHING_ATTEMPT = 'phishing_attempt',
  DATA_BREACH = 'data_breach',
  INSIDER_THREAT = 'insider_threat',
  ZERO_DAY_EXPLOIT = 'zero_day_exploit',
  SUPPLY_CHAIN_ATTACK = 'supply_chain_attack',
  RANSOMWARE = 'ransomware',
  ADVANCED_PERSISTENT_THREAT = 'advanced_persistent_threat',
  SOCIAL_ENGINEERING = 'social_engineering',
  CREDENTIAL_STUFFING = 'credential_stuffing',
}

export enum ThreatStatus {
  DETECTED = 'detected',
  CONFIRMED = 'confirmed',
  MITIGATED = 'mitigated',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  FALSE_POSITIVE = 'false_positive',
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('security_threats')
@Index(['threatType', 'status'])
@Index(['severity', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['userId', 'createdAt'])
export class SecurityThreat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ThreatType,
  })
  threatType: ThreatType;

  @Column({
    type: 'enum',
    enum: ThreatStatus,
    default: ThreatStatus.DETECTED,
  })
  status: ThreatStatus;

  @Column({
    type: 'enum',
    enum: ThreatSeverity,
    default: ThreatSeverity.MEDIUM,
  })
  severity: ThreatSeverity;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  sourceIp?: string;

  @Column({ nullable: true })
  targetIp?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  indicators?: string[];

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  evidence?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  impact?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  mitigation?: Record<string, any>;

  @Column({ nullable: true })
  threatScore?: number;

  @Column({ nullable: true })
  confidence?: number;

  @Column({ type: 'jsonb', nullable: true })
  relatedEvents?: string[];

  @Column({ type: 'jsonb', nullable: true })
  relatedAnomalies?: string[];

  @Column({ nullable: true })
  investigationNotes?: string;

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ nullable: true })
  resolutionNotes?: string;

  @Column({ nullable: true })
  externalThreatId?: string;

  @Column({ type: 'jsonb', nullable: true })
  externalData?: Record<string, any>;

  @Column({ nullable: true })
  iocHash?: string;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @Column({ nullable: true })
  mitigatedAt?: Date;
} 