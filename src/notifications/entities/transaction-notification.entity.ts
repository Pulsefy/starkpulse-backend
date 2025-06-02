import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { User } from '../../auth/entities/user.entity';
  import { Transaction } from '../../transactions/entities/transaction.entity';
  
  @Entity()
  export class TransactionNotification {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
  
    @Column()
    userId: string;
  
    @ManyToOne(() => Transaction)
    @JoinColumn({ name: 'transactionId' })
    transaction: Transaction;
  
    @Column()
    transactionId: string;
  
    @Column()
    title: string;
  
    @Column('text')
    message: string;
  
    @Column({ type: 'jsonb', nullable: true })
    metadata: any;
  
    @Column({ default: false })
    read: boolean;
  
    @Column()
    channel: 'in_app' | 'email' | 'push';
  
    @Column()
    eventType: 'status_change' | 'error' | 'confirmation' | 'other';
  
    @CreateDateColumn()
    createdAt: Date;
  }