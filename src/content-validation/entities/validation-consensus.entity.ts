import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { ValidationTask } from "./validation-task.entity"

export enum ConsensusStatus {
  PENDING = "pending",
  REACHED = "reached",
  DISPUTED = "disputed",
  FAILED = "failed",
}

export enum ConsensusDecision {
  APPROVED = "approved",
  REJECTED = "rejected",
  NEEDS_MORE_VALIDATION = "needs_more_validation",
}

@Entity("validation_consensus")
export class ValidationConsensus {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  validationTaskId: string

  @ManyToOne(
    () => ValidationTask,
    (task) => task.consensus,
  )
  @JoinColumn({ name: "validationTaskId" })
  validationTask: ValidationTask

  @Column({
    type: "enum",
    enum: ConsensusStatus,
    default: ConsensusStatus.PENDING,
  })
  status: ConsensusStatus

  @Column({
    type: "enum",
    enum: ConsensusDecision,
    nullable: true,
  })
  decision: ConsensusDecision

  @Column({ type: "decimal", precision: 3, scale: 2 })
  consensusThreshold: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  achievedConsensus: number

  @Column({ type: "int" })
  totalValidators: number

  @Column({ type: "int" })
  approvalCount: number

  @Column({ type: "int" })
  rejectionCount: number

  @Column({ type: "int" })
  reviewCount: number

  @Column({ type: "decimal", precision: 5, scale: 2 })
  weightedScore: number

  @Column({ type: "jsonb", nullable: true })
  validatorWeights: Record<string, number>

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
