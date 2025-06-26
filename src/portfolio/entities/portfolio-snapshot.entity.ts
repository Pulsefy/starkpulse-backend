import { User } from '../../auth/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'portfolio_snapshot' })
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: '0' })
  totalValueUsd: string;

  @Column({ type: 'int', default: 0 })
  assetCount: number;

  /** JSON object mapping each assetAddress to { balance, valueUsd } */
  @Column({ type: 'jsonb' })
  assetBreakdown: Record<string, any>;

  /** When this snapshot was recorded */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
