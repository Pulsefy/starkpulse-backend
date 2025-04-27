import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { EventType } from '../enums/EventType.enum';

@Entity()
export class TransactionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.events)
  @Index()
  transaction: Transaction;

  @Column()
  transactionId: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  type: EventType;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
