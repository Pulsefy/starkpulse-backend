import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('staking')
@Index(['userId', 'status'])
@Index(['delegatedTo', 'status'])
export class Staking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  stakedAmount: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  rewardsClaimed: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  pendingRewards: number;

  @Column({
    type: 'enum',
    enum: ['ACTIVE', 'UNSTAKING', 'UNSTAKED'],
    default: 'ACTIVE'
  })
  status: string;

  @Column('int', { default: 14 })
  lockPeriodDays: number;

  @Column('timestamp', { nullable: true })
  stakedAt: Date;

  @Column('timestamp', { nullable: true })
  unstakeRequestedAt: Date;

  @Column('timestamp', { nullable: true })
  canUnstakeAt: Date;

  @Column('uuid', { nullable: true })
  delegatedTo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'delegatedTo' })
  delegate: User;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  apy: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
