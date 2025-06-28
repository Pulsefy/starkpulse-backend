import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { TechnicalIndicators } from '../services/technical-indicators.service';
import { SentimentData } from '../services/sentiment-analysis.service';

@Entity('market_data')
@Index(['symbol', 'timestamp'])
@Index(['symbol', 'timestamp', 'source'])
export class MarketData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  symbol: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  price: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  volume: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  marketCap: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  priceChange24h: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  qualityScore: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  confidence: number;

  @Column({ type: 'varchar', length: 50 })
  source: string;

  @Column({ type: 'jsonb', nullable: true })
  indicators: TechnicalIndicators;

  @Column({ type: 'jsonb', nullable: true })
  sentiment: SentimentData;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
