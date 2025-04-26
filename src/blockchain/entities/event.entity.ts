import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ContractEntity } from './contract.entity';

@Entity('contract_events')
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

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ContractEntity, contract => contract.events)
  @JoinColumn({ name: 'contractId' })
  contract: ContractEntity;

  @Column()
  contractId: string;
} 