import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_preferences')
@Index(['userId'])
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column('simple-array')
  preferredCategories: string[];

  @Column('simple-array')
  preferredSources: string[];

  @Column('simple-array', { nullable: true })
  blockedSources?: string[];

  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @Column({ nullable: true })
  sentimentPreference?: 'positive' | 'negative' | 'neutral' | 'all';

  @Column('json', { nullable: true })
  readingHistory?: {
    articleId: string;
    readAt: Date;
    timeSpent?: number;
    engagement?: 'like' | 'share' | 'comment';
  }[];

  @Column('json', { nullable: true })
  interactionWeights?: {
    category: Record<string, number>;
    source: Record<string, number>;
    keywords: Record<string, number>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}