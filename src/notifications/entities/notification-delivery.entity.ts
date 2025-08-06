import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Notification } from './notification.entity';

@Entity()
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Notification, notification => notification.deliveries)
  notification: Notification;

  @Column()
  channel: string;

  @Column()
  status: string; // SENT, FAILED, RETRYING

  @Column({ nullable: true })
  error: string;

  @CreateDateColumn()
  attemptedAt: Date;
} 