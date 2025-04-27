import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './category.entity';
import { Tag } from './tag.entity';
import { Author } from './author.entity';

@Entity()
export class NewsArticle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  summary: string;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Author, author => author.articles)
  author: Author;

  @ManyToMany(() => Category)
  @JoinTable()
  categories: Category[];

  @ManyToMany(() => Tag)
  @JoinTable()
  tags: Tag[];

  @Column({ nullable: true })
  featuredImage: string;

  @Column({ default: 0 })
  viewCount: number;
}