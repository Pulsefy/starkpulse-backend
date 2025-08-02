import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DataSubjectRequestType } from '../dto/data-subject-request.dto';

@Entity('data_subject_requests')
export class DataSubjectRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: DataSubjectRequestType })
  type: DataSubjectRequestType;

  @Column({ nullable: true })
  details?: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'completed' | 'rejected';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
