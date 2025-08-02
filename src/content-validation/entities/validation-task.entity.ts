import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm"
import { ContentItem } from "./content-item.entity"
import { ValidationResult } from "./validation-result.entity"
import { ValidationConsensus } from "./validation-consensus.entity"

export enum TaskStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

@Entity("validation_tasks")
export class ValidationTask {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  contentItemId: string

  @ManyToOne(
    () => ContentItem,
    (content) => content.validationTasks,
  )
  @JoinColumn({ name: "contentItemId" })
  contentItem: ContentItem

  @Column({
    type: "enum",
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus

  @Column({
    type: "enum",
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority

  @Column({ type: "int", default: 3 })
  requiredValidators: number

  @Column({ type: "int", default: 0 })
  assignedValidators: number

  @Column({ type: "timestamp" })
  deadline: Date

  @Column({ type: "decimal", precision: 10, scale: 2 })
  rewardAmount: number

  @Column({ type: "jsonb", nullable: true })
  validationCriteria: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  specialRequirements: string[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(
    () => ValidationResult,
    (result) => result.validationTask,
  )
  validationResults: ValidationResult[]

  @OneToMany(
    () => ValidationConsensus,
    (consensus) => consensus.validationTask,
  )
  consensus: ValidationConsensus[]
}
