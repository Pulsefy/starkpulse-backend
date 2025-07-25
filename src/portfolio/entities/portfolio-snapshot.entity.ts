import { User } from '../../auth/entities/user.entity';
import { Chain } from '../../blockchain/enums/chain.enum';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity({ name: 'portfolio_snapshot' })
@Index(['chain'])
@Index(['userId'])
@Index(['timestamp'])
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: Chain })
  chain: Chain;

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
