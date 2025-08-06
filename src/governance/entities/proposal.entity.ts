import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vote } from './vote.entity';

@Entity('proposals')
@Index(['status', 'createdAt'])
@Index(['proposerId', 'status'])
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  description: string;

  @Column('uuid')
  proposerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'proposerId' })
  proposer: User;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'ACTIVE', 'PASSED', 'REJECTED', 'EXPIRED', 'EXECUTED'],
    default: 'DRAFT'
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['FEATURE', 'PARAMETER', 'TREASURY', 'UPGRADE', 'COMMUNITY'],
    default: 'FEATURE'
  })
  type: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  votesFor: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  votesAgainst: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  votesAbstain: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  totalVotes: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  quorumRequired: number;

  @Column('int', { default: 7 })
  votingPeriodDays: number;

  @Column('timestamp', { nullable: true })
  votingStartsAt: Date;

  @Column('timestamp', { nullable: true })
  votingEndsAt: Date;

  @Column('timestamp', { nullable: true })
  executedAt: Date;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('text', { nullable: true })
  executionData: string;

  @OneToMany(() => Vote, vote => vote.proposal)
  votes: Vote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
