import { User } from '../../auth/entities/user.entity';

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.snapshots, { eager: false })
  user: User;

  @Column('float')
  totalValue: number;

  @Column('jsonb')
  assetBreakdown: Record<string, number>; // Example: { BTC: 1.5, ETH: 3 }

  @CreateDateColumn()
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}
