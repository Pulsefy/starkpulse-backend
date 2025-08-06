import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Proposal } from './proposal.entity';

@Entity('votes')
@Index(['proposalId', 'voterId'])
@Unique(['proposalId', 'voterId'])
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  proposalId: string;

  @ManyToOne(() => Proposal, proposal => proposal.votes)
  @JoinColumn({ name: 'proposalId' })
  proposal: Proposal;

  @Column('uuid')
  voterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'voterId' })
  voter: User;

  @Column({
    type: 'enum',
    enum: ['FOR', 'AGAINST', 'ABSTAIN'],
  })
  voteType: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  votingPower: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  weightedVote: number;

  @Column('text', { nullable: true })
  reason: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('boolean', { default: false })
  isDelegated: boolean;

  @Column('uuid', { nullable: true })
  delegatedFrom: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
