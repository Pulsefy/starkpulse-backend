import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/auth/entities/user.entity';

@Entity()
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: true })
  inApp: boolean;

  @Column({ default: false })
  email: boolean;

  @Column({ default: false })
  push: boolean;

  // Transaction-specific preferences
  @Column({ default: true })
  transactionStatusChanges: boolean;

  @Column({ default: true })
  transactionErrors: boolean;

  @Column({ default: true })
  transactionConfirmations: boolean;
}