import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('decentralized_sources')
@Index(['type'])
@Index(['reliabilityScore'])
@Index(['lastVerified'])
export class DecentralizedSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: ['RSS', 'API', 'BLOCKCHAIN', 'IPFS', 'SOCIAL'],
  })
  @Index()
  type: 'RSS' | 'API' | 'BLOCKCHAIN' | 'IPFS' | 'SOCIAL';

  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  @Index()
  reliabilityScore: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  factualAccuracy: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  editorialBias: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  transparencyScore: number;

  @Column({ nullable: true })
  @Index()
  lastVerified?: Date;

  @Column({ nullable: true })
  verificationMethod?: string;

  @Column('simple-array', { nullable: true })
  categories?: string[];

  @Column('json', { nullable: true })
  apiConfig?: {
    apiKey?: string;
    headers?: Record<string, string>;
    rateLimitPerHour?: number;
    authMethod?: string;
  };

  @Column('json', { nullable: true })
  blockchainConfig?: {
    contractAddress?: string;
    network?: string;
    eventTopics?: string[];
  };

  @Column('json', { nullable: true })
  socialConfig?: {
    platform?: string;
    accountId?: string;
    hashtags?: string[];
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  articlesProcessed: number;

  @Column({ default: 0 })
  errorsCount: number;

  @Column({ nullable: true })
  lastError?: string;

  @Column({ nullable: true })
  lastSuccessfulFetch?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  lastFetched: Date;
  articleCount: any;
}
