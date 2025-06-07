// src/transactions/entities/transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/users.entity';
import { TransactionNotification } from '../../notifications/entities/transaction-notification.entity';
import { TransactionType } from '../enums/transactionType.enum';
import { TransactionEvent } from './transaction-event.entity';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.transaction)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column()
  transactionHash: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  blockNumber: number;

  @Column({ nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @OneToMany(
    () => TransactionNotification,
    (notification) => notification.transaction,
  )
  notifications: TransactionNotification[];

  @OneToMany(() => TransactionEvent, (event) => event.transaction)
  events: TransactionEvent[];

  @Column({ type: 'varchar', length: 42 })
  fromAddress: string;

  @Column({ type: 'varchar', length: 42, nullable: true })
  toAddress: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  value: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tokenSymbol: string;

  @Column({ type: 'varchar', length: 42, nullable: true })
  tokenAddress: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.OTHER,
  })
  type: TransactionType;

  @Column({ type: 'timestamp', nullable: true })
  blockTimestamp: Date;

  @Column({ type: 'integer', default: 0 })
  confirmations: number;

  @Column({ default: 0 })
  retries: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  method?: string;


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
