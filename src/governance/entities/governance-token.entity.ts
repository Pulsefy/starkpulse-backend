import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('governance_tokens')
@Index(['userId', 'tokenType'])
export class GovernanceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  balance: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  stakedBalance: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  lockedBalance: number;

  @Column({
    type: 'enum',
    enum: ['GOVERNANCE', 'REWARD', 'UTILITY'],
    default: 'GOVERNANCE'
  })
  tokenType: string;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  votingPower: number;

  @Column('decimal', { precision: 18, scale: 8, default: 0 })
  delegatedPower: number;

  @Column('uuid', { nullable: true })
  delegatedTo: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
