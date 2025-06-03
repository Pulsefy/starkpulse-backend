import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';

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

  /** JSON object mapping each assetAddress to { balance, valueUsd } */
  @Column({ type: 'jsonb' })
  assetBreakdown: Record<string, any>;

  /** When this snapshot was recorded */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
