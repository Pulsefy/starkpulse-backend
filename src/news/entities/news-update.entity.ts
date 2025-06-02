import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class NewsUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  category: string; // e.g., 'nfts', 'defi', 'starknet', etc.

  @CreateDateColumn()
  createdAt: Date;
}
