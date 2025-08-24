import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/users.entity';
import { Proposal } from './proposal.entity';

export enum VoteType {
  YES = 'yes',
  NO = 'no',
  ABSTAIN = 'abstain',
}

@Entity()
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  voter: User;

  @ManyToOne(() => Proposal, proposal => proposal.votes)
  proposal: Proposal;

  @Column({
    type: 'enum',
    enum: VoteType,
  })
  voteType: VoteType;

  @Column('decimal', { precision: 36, scale: 18 })
  votingPower: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  transactionHash: string;

  @CreateDateColumn()
  createdAt: Date;
}