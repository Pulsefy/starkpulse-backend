import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class NotificationGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('text')
  groupName: string; // e.g., 'daily_digest', 'weekly_digest'

  @Column('jsonb')
  notifications: Array<{ title: string; content: string; type: string }>;

  @Column({ default: false })
  sent: boolean;
}
