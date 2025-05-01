import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { NewsArticle } from './news_articles.entities';
// import { NewsArticle } from './news-article.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => NewsArticle, article => article.categories)
  articles: NewsArticle[];
}