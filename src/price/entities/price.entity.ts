import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class PriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column()
  tokenSymbol: string; // e.g., "STRK", "XLM"

  @Column('float')
  threshold: number;

  @Column()
  direction: 'above' | 'below'; // above or below threshold

  @Column({ default: false })
  triggered: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
