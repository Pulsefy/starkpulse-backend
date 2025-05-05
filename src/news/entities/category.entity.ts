import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';
import { NewsArticle } from './news_articles.entities';
// import { NewsArticle } from './news_articles.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => NewsArticle, (article) => article.categories)
  articles: NewsArticle[];
}
