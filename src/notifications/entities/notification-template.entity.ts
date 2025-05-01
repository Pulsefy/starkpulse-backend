import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: 'transaction' | 'price_alert' | 'news_update'; // Define types here

  @Column('text')
  template: string; // Store the template content

  @Column('text', { nullable: true })
  subject: string; // Optional field for email subject
}
