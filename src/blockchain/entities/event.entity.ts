import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ContractEntity } from './contract.entity';
import { Chain } from '../enums/chain.enum';

@Entity('contract_events')
@Index(['chain'])
@Index(['contractId'])
@Index(['blockNumber'])
@Index(['timestamp'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'json' })
  data: any;

  @Column({ nullable: true })
  blockNumber: number;

  @Column({ nullable: true })
  blockHash: string;

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ nullable: true })
  sequence: number;

  @Column({ default: false })
  isProcessed: boolean;

  @Column({ type: 'enum', enum: Chain })
  chain: Chain;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ContractEntity, (contract) => contract.events)
  @JoinColumn({ name: 'contractId' })
  contract: ContractEntity;

  @Column()
  contractId: string;
}
