import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Validator } from "./validator.entity"

export enum RewardType {
  VALIDATION_REWARD = "validation_reward",
  CONSENSUS_BONUS = "consensus_bonus",
  ACCURACY_BONUS = "accuracy_bonus",
  STAKE_REWARD = "stake_reward",
  REFERRAL_BONUS = "referral_bonus",
}

export enum RewardStatus {
  PENDING = "pending",
  DISTRIBUTED = "distributed",
  FAILED = "failed",
}

@Entity("validator_rewards")
export class ValidatorReward {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  validatorId: string

  @ManyToOne(
    () => Validator,
    (validator) => validator.rewards,
  )
  @JoinColumn({ name: "validatorId" })
  validator: Validator

  @Column({
    type: "enum",
    enum: RewardType,
  })
  rewardType: RewardType

  @Column({ type: "decimal", precision: 18, scale: 8 })
  amount: number

  @Column()
  currency: string

  @Column({
    type: "enum",
    enum: RewardStatus,
    default: RewardStatus.PENDING,
  })
  status: RewardStatus

  @Column({ type: "text", nullable: true })
  transactionHash: string

  @Column({ type: "text", nullable: true })
  reason: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: "timestamp", nullable: true })
  distributedAt: Date
}
