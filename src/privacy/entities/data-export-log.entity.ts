import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('data_export_logs')
export class DataExportLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'timestamp' })
  requestedAt: Date;

  @Column({ nullable: true })
  exportFileUrl?: string;

  @CreateDateColumn()
  createdAt: Date;
}
