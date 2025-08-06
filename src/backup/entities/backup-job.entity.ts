import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('backup_jobs')
export class BackupJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  type: 'database' | 'config' | 'other';

  @Column({ type: 'varchar', length: 512 })
  filePath: string;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;
}
