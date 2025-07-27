import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm"

export enum HistoryEventType {
  TASK_CREATED = "task_created",
  VALIDATOR_ASSIGNED = "validator_assigned",
  VALIDATION_SUBMITTED = "validation_submitted",
  CONSENSUS_REACHED = "consensus_reached",
  REWARD_DISTRIBUTED = "reward_distributed",
  DISPUTE_RAISED = "dispute_raised",
  DISPUTE_RESOLVED = "dispute_resolved",
}

@Entity("validation_history")
export class ValidationHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  entityId: string

  @Column()
  entityType: string

  @Column({
    type: "enum",
    enum: HistoryEventType,
  })
  eventType: HistoryEventType

  @Column({ type: "jsonb" })
  eventData: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  previousState: Record<string, any>

  @Column({ type: "jsonb", nullable: true })
  newState: Record<string, any>

  @Column({ nullable: true })
  triggeredBy: string

  @CreateDateColumn()
  createdAt: Date
}
