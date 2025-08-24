import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn, 
  OneToMany, 
  Index 
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vote } from './vote.entity';

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PASSED = 'PASSED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  EXECUTED = 'EXECUTED',
  CANCELED = 'CANCELED',
}

export enum ProposalType {
  FEATURE = 'FEATURE',
  PARAMETER = 'PARAMETER',
  TREASURY = 'TREASURY',
  UPGRADE = 'UPGRADE',
  COMMUNITY = 'COMMUNITY',
}

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

  @Column('text', { nullable: true })
  content: string; // ✅ kept from first version (proposal body)

  @Column('uuid')
  proposerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'proposerId' })
  proposer: User;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.DRAFT,
  })
  status: ProposalStatus;

  @Column({
    type: 'enum',
    enum: ProposalType,
    default: ProposalType.FEATURE,
  })
  type: ProposalType;

  // ✅ voting counts with decimals
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

  @Column({ default: false })
  isExecuted: boolean; // ✅ kept from first version

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('text', { nullable: true })
  executionData: string;

  @Column({ nullable: true })
  transactionHash: string; // ✅ kept from first version

  @Column({ nullable: true })
  contractAddress: string; // ✅ kept from first version

  @OneToMany(() => Vote, vote => vote.proposal)
  votes: Vote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
