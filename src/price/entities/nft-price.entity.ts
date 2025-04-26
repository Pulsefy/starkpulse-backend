import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class NftPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contractAddress: string;

  @Column()
  tokenId: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  priceUsd: string;

  @Column()
  sourceName: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
