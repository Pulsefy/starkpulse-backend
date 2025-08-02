import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/users.entity';


@Entity()
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  // Channel preferences
  @Column({ default: true })
  inApp: boolean;

  @Column({ default: false })
  email: boolean;

  @Column({ default: false })
  push: boolean;

  @Column({ default: false })
  sms: boolean;

  // Notification type preferences
  @Column({ default: true })
  transactionStatusChanges: boolean;

  @Column({ default: true })
  transactionErrors: boolean;

  @Column({ default: true })
  transactionConfirmations: boolean;

  @Column({ default: true })
  securityAlerts: boolean;

  @Column({ default: true })
  priceAlerts: boolean;

  @Column({ default: true })
  portfolioUpdates: boolean;

  @Column({ default: true })
  newsUpdates: boolean;

  @Column({ default: true })
  systemAnnouncements: boolean;

  // Frequency & Quiet Hours
  @Column({
    type: 'enum',
    enum: ['immediate', 'daily', 'weekly', 'never'],
    default: 'immediate',
  })
  emailFrequency: 'immediate' | 'daily' | 'weekly' | 'never';

  @Column({
    type: 'enum',
    enum: ['immediate', 'daily', 'weekly', 'never'],
    default: 'immediate',
  })
  pushFrequency: 'immediate' | 'daily' | 'weekly' | 'never';

  @Column({ type: 'boolean', default: false })
  enableQuietHours: boolean;

  @Column({ type: 'varchar', length: 5, nullable: true })
  quietHoursStart?: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  quietHoursEnd?: string;

  @Column({ type: 'boolean', default: false })
  quietHoursExceptUrgent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
