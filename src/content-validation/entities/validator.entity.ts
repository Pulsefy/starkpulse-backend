import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { ValidationResult } from "./validation-result.entity"
import { ReputationScore } from "./reputation-score.entity"
import { ValidatorReward } from "./validator-reward.entity"

export enum ValidatorStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING = "pending",
}

export enum ValidatorTier {
  BRONZE = "bronze",
  SILVER = "silver",
  GOLD = "gold",
  PLATINUM = "platinum",
}

@Entity("validators")
export class Validator {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  walletAddress: string

  @Column()
  publicKey: string

  @Column({ nullable: true })
  name: string

  @Column({ nullable: true })
  email: string

  @Column({
    type: "enum",
    enum: ValidatorStatus,
    default: ValidatorStatus.PENDING,
  })
  status: ValidatorStatus

  @Column({
    type: "enum",
    enum: ValidatorTier,
    default: ValidatorTier.BRONZE,
  })
  tier: ValidatorTier

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  stakeAmount: number

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  reputationScore: number

  @Column({ type: "int", default: 0 })
  totalValidations: number

  @Column({ type: "int", default: 0 })
  successfulValidations: number

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  accuracyRate: number

  @Column({ type: "jsonb", nullable: true })
  specializations: string[]

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: "timestamp", nullable: true })
  lastActiveAt: Date

  @OneToMany(
    () => ValidationResult,
    (result) => result.validator,
  )
  validationResults: ValidationResult[]

  @OneToMany(
    () => ReputationScore,
    (score) => score.validator,
  )
  reputationHistory: ReputationScore[]

  @OneToMany(
    () => ValidatorReward,
    (reward) => reward.validator,
  )
  rewards: ValidatorReward[]
}
