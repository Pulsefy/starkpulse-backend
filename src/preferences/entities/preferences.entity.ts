import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';

@Entity()
export class Preferences {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ default: 'light' })
  theme: 'light' | 'dark';

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @Column({ default: false })
  isProfilePublic: boolean;

  @Column({ default: true })
  syncAcrossDevices: boolean;

  @Column({ default: 'en' })
  language: string;

  @Column({ type: 'json', default: '{"email":true,"push":true}' })
  notificationPreferences: Record<string, boolean>;

  @Column({ type: 'json', nullable: true })
  dashboardLayout: any;

  @Column({ type: 'json', default: '{}' })
  betaFeatures: Record<string, boolean>;
}
