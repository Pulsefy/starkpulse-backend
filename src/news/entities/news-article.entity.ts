import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('news_articles')
@Index(['publishedAt'])
@Index(['category'])
@Index(['source'])
@Index(['reliabilityScore'])
export class NewsArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  source: string;

  @Column()
  author: string;

  @Column()
  url: string;

  @Column()
  @Index()
  publishedAt: Date;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column({ default: 'general' })
  @Index()
  category: string;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  sentimentScore?: number;

  @Column({ nullable: true })
  sentimentLabel?: 'positive' | 'negative' | 'neutral';

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  reliabilityScore: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  engagementScore?: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  relevanceScore: number;

  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @Column({ default: 'en' })
  language: string;

  @Column({ default: false })
  isBreaking: boolean;

  @Column({ default: false })
  isTrending: boolean;

  @Column('json', { nullable: true })
  metadata?: {
    wordCount?: number;
    readingTime?: number;
    shares?: number;
    comments?: number;
    likes?: number;
  };

  

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  sentiment: any;
}
