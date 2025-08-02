import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity()
export class TransactionIndex {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 66 })
  @Index({ unique: true })
  transactionHash: string;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  subcategory: string;

  @Column({ type: 'jsonb', default: {} })
  searchMetadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
