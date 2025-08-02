import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_retention_policies')
export class DataRetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  dataType: string;

  @Column()
  retentionPeriodDays: number;

  @Column()
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
