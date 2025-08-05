import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Validator } from "./validator.entity"

export enum ReputationChangeType {
  VALIDATION_SUCCESS = "validation_success",
  VALIDATION_FAILURE = "validation_failure",
  CONSENSUS_AGREEMENT = "consensus_agreement",
  CONSENSUS_DISAGREEMENT = "consensus_disagreement",
  STAKE_INCREASE = "stake_increase",
  STAKE_DECREASE = "stake_decrease",
  PENALTY = "penalty",
  BONUS = "bonus",
  REPUTATION_UPDATE = "REPUTATION_UPDATE",
}

@Entity("reputation_scores")
export class ReputationScore {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  validatorId: string

  @ManyToOne(
    () => Validator,
    (validator) => validator.reputationHistory,
  )
  @JoinColumn({ name: "validatorId" })
  validator: Validator

  @Column({ type: "decimal", precision: 5, scale: 2 })
  previousScore: number

  @Column({ type: "decimal", precision: 5, scale: 2 })
  newScore: number

  @Column({ type: "decimal", precision: 5, scale: 2 })
  change: number

  @Column({
    type: "enum",
    enum: ReputationChangeType,
  })
  changeType: ReputationChangeType

  @Column({ type: "text", nullable: true })
  reason: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date
}
