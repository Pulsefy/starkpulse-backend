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
import { User } from 'src/auth/entities/user.entity';
import { TransactionNotification } from 'src/notifications/entities/transaction-notification.entity';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column()
  hash: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  blockNumber: number;

  @Column({ nullable: true })
  error: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => TransactionNotification,
    (notification) => notification.transaction,
  )
  notifications: TransactionNotification[];
}
