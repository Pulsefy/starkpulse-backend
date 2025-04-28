import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm"
import { User } from "src/auth/entities/user.entity"

@Entity()
export class NotificationPreference {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User

  @Column()
  userId: string

  // Channel preferences
  @Column({ default: true })
  inApp: boolean

  @Column({ default: false })
  email: boolean

  @Column({ default: false })
  push: boolean

  // Notification type preferences
  @Column({ default: true })
  transactionStatusChanges: boolean

  @Column({ default: true })
  transactionErrors: boolean

  @Column({ default: true })
  transactionConfirmations: boolean

  @Column({ default: true })
  securityAlerts: boolean

  @Column({ default: true })
  priceAlerts: boolean

  @Column({ default: true })
  portfolioUpdates: boolean

  @Column({ default: true })
  newsUpdates: boolean

  @Column({ default: true })
  systemAnnouncements: boolean

  // Frequency settings
  @Column({ default: "immediate" })
  emailFrequency: "immediate" | "daily" | "weekly" | "never"

  @Column({ default: "immediate" })
  pushFrequency: "immediate" | "daily" | "weekly" | "never"

  // Quiet hours
  @Column({ default: false })
  enableQuietHours: boolean

  @Column({ default: "22:00" })
  quietHoursStart: string

  @Column({ default: "08:00" })
  quietHoursEnd: string

  @Column({ default: true })
  quietHoursExceptUrgent: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
