import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('privacy_impact_assessments')
export class PrivacyImpactAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assessmentName: string;

  @Column('text')
  summary: string;

  @Column('json')
  findings: Record<string, any>;

  @Column({ default: false })
  completed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
