import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/users.entity';
import { Vote } from './vote.entity';

export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  CANCELED = 'canceled',
}

@Entity()
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.DRAFT,
  })
  status: ProposalStatus;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ nullable: true })
  executionTime: Date;

  @Column({ default: 0 })
  yesVotes: number;

  @Column({ default: 0 })
  noVotes: number;

  @Column({ default: 0 })
  abstainVotes: number;

  @Column({ default: false })
  isExecuted: boolean;

  @ManyToOne(() => User)
  proposer: User;

  @OneToMany(() => Vote, vote => vote.proposal)
  votes: Vote[];

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ nullable: true })
  contractAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}