import { User } from '../../auth/entities/user.entity';

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  walletAddress?: string;

  @Column({ type: 'jsonb' })
  deviceInfo: {
    browser: string;
    os: string;
    deviceType: string;
    ip: string;
    userAgent: string;
    deviceName: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  lastActiveAt: Date;

  @Column({ default: false })
  revoked: boolean;  // <--- This is the key addition

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  ipAddress: any;
}
