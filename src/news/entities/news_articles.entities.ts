import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Category } from './category.entity';

@Entity()
export class NewsArticle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @ManyToMany(() => Category, (category) => category.articles, {
    cascade: true,
    eager: true, // Optional: loads categories automatically
  })
  @JoinTable() // Owning side of the relationship
  categories: Category[];
  author: import("/home/wilfred/OD/stark_pulse_backend/starkpulse-backend/src/news/entities/author.entity").Author;
  tags: import("/home/wilfred/OD/stark_pulse_backend/starkpulse-backend/src/news/entities/tag.entity").Tag[];
}
