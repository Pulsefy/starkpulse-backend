// src/notifications/entities/notification.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/users.entity';
import { NotificationType } from '../enums/notificationType.enum';



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
    enum: ['in_app', 'email', 'push'],
  })
  channel: 'in_app' | 'email' | 'push';

  @Column({
    type: 'enum',
    enum: ['PENDING', 'SENT', 'FAILED', 'RETRYING'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';

  @Column({ default: 0 })
  retryCount: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;


  @Column({
    type: 'enum',
    enum: NotificationType,
    nullable: true, // optional if legacy rows exist
  })
  type: NotificationType;

  @Column({ default: false })
  isGrouped: boolean;

  @Column({ nullable: true })
  groupId: string;
}
