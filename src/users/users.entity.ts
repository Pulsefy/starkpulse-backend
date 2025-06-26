import { Transaction } from '../transactions/entities/transaction.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  pushSubscription: string;

  @Column({ default: true })
  allowInApp: boolean;

  @Column({ default: true })
  allowEmail: boolean;

  @Column({ default: true })
  allowPush: boolean;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];
}
