import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { NewsArticle } from './news_articles.entities';
// import { NewsArticle } from './news-article.entity';

@Entity()
export class Author {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatar: string;

  @OneToMany(() => NewsArticle, article => article.author)
  articles: NewsArticle[];
}