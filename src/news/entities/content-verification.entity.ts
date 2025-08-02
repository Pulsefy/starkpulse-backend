import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NewsArticle } from './news-article.entity';

@Entity('content_verification')
@Index(['contentHash'])
@Index(['status'])
@Index(['verifiedAt'])
export class ContentVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  articleId: string;

  @ManyToOne(() => NewsArticle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articleId' })
  article: NewsArticle;

  @Column()
  @Index()
  contentHash: string;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  factCheckScore: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  credibilityScore: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  biasScore: number;

  @Column({
    type: 'enum',
    enum: ['VALID', 'SUSPICIOUS', 'INVALID', 'PENDING'],
    default: 'PENDING',
  })
  @Index()
  status: 'VALID' | 'SUSPICIOUS' | 'INVALID' | 'PENDING';

  @Column('simple-array', { nullable: true })
  flags?: string[];

  @Column({ nullable: true })
  blockchainHash?: string;

  @Column({ nullable: true })
  ipfsHash?: string;

  @Column('json', { nullable: true })
  externalSources?: Array<{
    source: string;
    score: number;
    verified: boolean;
    timestamp: Date;
  }>;

  @Column('json', { nullable: true })
  mlProcessingResult?: {
    qualityScore: number;
    relevanceScore: number;
    duplicateScore: number;
    categories: string[];
    keywords: string[];
    namedEntities?: {
      persons: string[];
      organizations: string[];
      locations: string[];
      cryptocurrencies: string[];
    };
    summary: string;
    confidence: number;
  };

  @Column({ default: false })
  isBlockchainVerified: boolean;

  @Column({ default: false })
  isConsensusVerified: boolean;

  @Column({ default: 0 })
  consensusScore: number;

  @Column({ nullable: true })
  verificationMethod?: string;

  @Column({ nullable: true })
  verifiedBy?: string;

  @Column({ nullable: true })
  @Index()
  verifiedAt?: Date;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
