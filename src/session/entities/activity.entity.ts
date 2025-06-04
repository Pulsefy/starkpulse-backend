import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('session_activities')
export class SessionActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  metadata: string;

  @CreateDateColumn()
  timestamp: Date;
}