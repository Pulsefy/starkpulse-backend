import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_sources')
export class DataSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  baseUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  apiKey: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 1000 })
  rateLimitPerHour: number;

  @Column({ type: 'integer', default: 0 })
  currentUsage: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  reliability: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.33 })
  weight: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSuccessfulFetch: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastFailedFetch: Date;

  @Column({ type: 'integer', default: 0 })
  consecutiveFailures: number;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

