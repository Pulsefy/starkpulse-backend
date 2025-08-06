import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('privacy_requests')
export class PrivacyRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['ACCESS', 'DELETION', 'RECTIFICATION', 'PORTABILITY'],
  })
  type: 'ACCESS' | 'DELETION' | 'RECTIFICATION' | 'PORTABILITY';

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
