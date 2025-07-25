import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EventEntity } from './event.entity';
import { Chain } from '../enums/chain.enum';

@Entity('contracts')
@Index(['chain'])
@Index(['address'])
export class ContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  address: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'json' })
  abi: any;

  @Column({ type: 'simple-array', nullable: true, default: [] })
  monitoredEvents: string[];

  @Column({ type: 'enum', enum: Chain })
  chain: Chain;

  @Column({ nullable: true })
  lastSyncedBlock: number;

  @OneToMany(() => EventEntity, (event) => event.contract)
  events: EventEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
