import { User } from '../../auth/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: '0' })
  totalValueUsd: string;

  @Column({ type: 'jsonb' })
  assetBreakdown: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
