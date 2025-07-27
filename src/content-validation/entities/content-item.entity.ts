import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { ValidationTask } from "./validation-task.entity"
import { QualityMetric } from "./quality-metric.entity"

export enum ContentType {
  ARTICLE = "article",
  VIDEO = "video",
  AUDIO = "audio",
  IMAGE = "image",
  SOCIAL_POST = "social_post",
}

export enum ContentStatus {
  PENDING = "pending",
  VALIDATING = "validating",
  VALIDATED = "validated",
  REJECTED = "rejected",
  DISPUTED = "disputed",
}

@Entity("content_items")
export class ContentItem {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column({ type: "text" })
  content: string

  @Column()
  sourceUrl: string

  @Column()
  author: string

  @Column()
  publisher: string

  @Column({
    type: "enum",
    enum: ContentType,
  })
  type: ContentType

  @Column({
    type: "enum",
    enum: ContentStatus,
    default: ContentStatus.PENDING,
  })
  status: ContentStatus

  @Column({ type: "timestamp" })
  publishedAt: Date

  @Column({ type: "jsonb", nullable: true })
  tags: string[]

  @Column({ type: "jsonb", nullable: true })
  categories: string[]

  @Column({ type: "text", nullable: true })
  summary: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column({ type: "text", nullable: true })
  contentHash: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(
    () => ValidationTask,
    (task) => task.contentItem,
  )
  validationTasks: ValidationTask[]

  @OneToMany(
    () => QualityMetric,
    (metric) => metric.contentItem,
  )
  qualityMetrics: QualityMetric[]
}
