import { User } from '../../auth/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum AssetType {
  TOKEN = 'token',
  NFT = 'nft',
  OTHER = 'other',
}

@Entity()
export class PortfolioAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.portfolioAssets)
  user: User;

  @Column()
  userId: string;

  @Column()
  assetAddress: string;

  @Column({
    type: 'enum',
    enum: AssetType,
    default: AssetType.TOKEN,
  })
  assetType: AssetType;

  @Column({ nullable: true })
  tokenId?: string; // For NFTs

  @Column({ type: 'decimal', precision: 65, scale: 0, default: '0' })
  balance: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  symbol?: string;

  @Column({ nullable: true })
  decimals?: number;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
