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

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column()
  pushSubscription: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ default: false })
  read: boolean;

  @Column()
  channel: 'in_app' | 'email' | 'push'; // keep only one, remove 'type'

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';

  @Column({ default: 0 })
  retryCount: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" }) // added JoinColumn
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
