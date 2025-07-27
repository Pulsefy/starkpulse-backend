import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { ValidationTask } from "./validation-task.entity"
import { Validator } from "./validator.entity"

export enum ValidationDecision {
  APPROVE = "approve",
  REJECT = "reject",
  NEEDS_REVIEW = "needs_review",
}

@Entity("validation_results")
export class ValidationResult {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  validationTaskId: string

  @ManyToOne(
    () => ValidationTask,
    (task) => task.validationResults,
  )
  @JoinColumn({ name: "validationTaskId" })
  validationTask: ValidationTask

  @Column()
  validatorId: string

  @ManyToOne(
    () => Validator,
    (validator) => validator.validationResults,
  )
  @JoinColumn({ name: "validatorId" })
  validator: Validator

  @Column({
    type: "enum",
    enum: ValidationDecision,
  })
  decision: ValidationDecision

  @Column({ type: "decimal", precision: 3, scale: 2 })
  confidenceScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  accuracyScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  reliabilityScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  biasScore: number

  @Column({ type: "text", nullable: true })
  comments: string

  @Column({ type: "jsonb", nullable: true })
  evidence: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  flags: string[]

  @Column({ type: "int" })
  timeSpentMinutes: number

  @CreateDateColumn()
  createdAt: Date
}
