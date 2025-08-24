import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('contributions')
@Index(['userId', 'type', 'createdAt'])
@Index(['status', 'reviewedAt'])
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['CODE_COMMIT', 'BUG_REPORT', 'FEATURE_REQUEST', 'DOCUMENTATION', 'COMMUNITY_HELP', 'GOVERNANCE_PARTICIPATION', 'REFERRAL', 'CONTENT_CREATION', 'TESTING', 'TRANSLATION'],
    default: 'CODE_COMMIT'
  })
  type: string;

  @Column({ length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  externalUrl: string;

  @Column('text', { nullable: true })
  repositoryUrl: string;

  @Column('text', { nullable: true })
  commitHash: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'REWARDED'],
    default: 'PENDING'
  })
  status: string;

  @Column('int', { default: 0 })
  baseScore: number;

  @Column('decimal', { precision: 10, scale: 4, default: 1.0 })
  multiplier: number;

  @Column('int', { default: 0 })
  finalScore: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  tokenReward: number;

  @Column('uuid', { nullable: true })
  reviewedBy: string;

  @Column('timestamp', { nullable: true })
  reviewedAt: Date;

  @Column('text', { nullable: true })
  reviewNotes: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('boolean', { default: false })
  isRewarded: boolean;

  @Column('timestamp', { nullable: true })
  rewardedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
