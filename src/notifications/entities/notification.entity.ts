import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/users.entity';
import { NotificationStatus } from '../enums/notificationStatus.enum';
import { NotificationType } from '../enums/notificationType.enum';
import { NotificationDelivery } from './notification-delivery.entity';

// Remove the duplicate enum definition:
// export enum NotificationStatus { ... }

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column({ nullable: true })
  pushSubscription: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ default: false })
  read: boolean;

  @Column({
    type: 'enum',
    enum: ['in_app', 'email', 'push', 'sms'],
    default: 'in_app',
  })
  channel: 'in_app' | 'email' | 'push' | 'sms';

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ default: 0 })
  retryCount: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    nullable: true,
  })
  type: NotificationType;

  @Column({ default: false })
  isGrouped: boolean;

  @Column({ nullable: true })
  groupId: string;

  @Column({ type: 'text', nullable: true })
  htmlBody?: string;

  @Column({ type: 'text', nullable: true })
  textBody?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  templateKey?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerMessageId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorReason?: string;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
    nullable: true,
  })
  priority?: NotificationPriority;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NotificationDelivery, delivery => delivery.notification)
  deliveries: NotificationDelivery[];
}
