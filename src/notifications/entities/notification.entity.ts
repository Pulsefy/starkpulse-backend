import { User } from 'src/users/users.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';

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
  channel: 'in_app' | 'email' | 'push';

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  user: User;

  @Column()
  type: 'IN_APP' | 'EMAIL' | 'PUSH';

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';

  @Column({ default: 0 })
  retryCount: number;
}
