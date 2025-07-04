import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('data_retention_logs')
export class DataRetentionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'timestamp' })
  scheduledDeletionAt: Date;

  @Column({ default: false })
  deleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
