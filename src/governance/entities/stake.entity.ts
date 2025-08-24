import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/users.entity';

@Entity()
export class Stake {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column('decimal', { precision: 36, scale: 18 })
  amount: number;

  @Column({ type: 'timestamp' })
  lockupEndTime: Date;

  @Column({ default: false })
  isUnstaked: boolean;

  @Column({ nullable: true })
  unstakeTransactionHash: string;

  @Column({ nullable: true })
  stakeTransactionHash: string;

  @Column('decimal', { precision: 36, scale: 18, default: 0 })
  rewardEarned: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}