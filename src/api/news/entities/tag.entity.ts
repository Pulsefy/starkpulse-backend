import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { NewsArticle } from './news_articles.entities';
// import { NewsArticle } from './news-article.entity';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  name: string;

  @ManyToMany(() => NewsArticle, article => article.tags)
  articles: NewsArticle[];
}