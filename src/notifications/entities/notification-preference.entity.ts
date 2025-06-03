// src/notifications/entities/notification-preference.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/users.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
