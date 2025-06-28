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

export enum AnomalyType {
  UNUSUAL_LOGIN_PATTERN = 'unusual_login_pattern',
  UNUSUAL_ACCESS_TIME = 'unusual_access_time',
  UNUSUAL_LOCATION = 'unusual_location',
  UNUSUAL_DEVICE = 'unusual_device',
  UNUSUAL_BEHAVIOR = 'unusual_behavior',
  UNUSUAL_API_USAGE = 'unusual_api_usage',
  UNUSUAL_DATA_ACCESS = 'unusual_data_access',
  UNUSUAL_TRANSACTION_PATTERN = 'unusual_transaction_pattern',
  UNUSUAL_NETWORK_ACTIVITY = 'unusual_network_activity',
  UNUSUAL_SYSTEM_ACTIVITY = 'unusual_system_activity',
}

export enum AnomalyStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
}

@Entity('security_anomalies')
@Index(['userId', 'createdAt'])
@Index(['anomalyType', 'status'])
@Index(['ipAddress', 'createdAt'])
@Index(['confidence', 'createdAt'])
export class SecurityAnomaly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AnomalyType,
  })
  anomalyType: AnomalyType;

  @Column({
    type: 'enum',
    enum: AnomalyStatus,
    default: AnomalyStatus.DETECTED,
  })
  status: AnomalyStatus;

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
  location?: string;

  @Column({ nullable: true })
  deviceFingerprint?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({ type: 'jsonb', nullable: true })
  baselineData?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  anomalyData?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  indicators?: string[];

  @Column({ nullable: true })
  investigationNotes?: string;

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ nullable: true })
  resolutionNotes?: string;

  @Column({ type: 'jsonb', nullable: true })
  relatedEvents?: string[];

  @Column({ nullable: true })
  threatScore?: number;

  @Column({ nullable: true })
  riskLevel?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  resolvedAt?: Date;
} 