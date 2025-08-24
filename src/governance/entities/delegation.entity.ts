import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/users.entity';

@Entity()
export class Delegation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  delegator: User;

  @ManyToOne(() => User)
  delegate: User;

  @Column('decimal', { precision: 36, scale: 18 })
  amount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ nullable: true })
  revocationTransactionHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}