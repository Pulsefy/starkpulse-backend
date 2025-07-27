import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm"

export enum RecordType {
  VALIDATION_RESULT = "validation_result",
  CONSENSUS_DECISION = "consensus_decision",
  REPUTATION_UPDATE = "reputation_update",
  REWARD_DISTRIBUTION = "reward_distribution",
}

@Entity("blockchain_records")
export class BlockchainRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: RecordType,
  })
  recordType: RecordType

  @Column()
  transactionHash: string

  @Column()
  blockNumber: number

  @Column()
  blockHash: string

  @Column({ type: "jsonb" })
  data: Record<string, any>

  @Column()
  dataHash: string

  @Column({ type: "text" })
  signature: string

  @Column()
  validatorAddress: string

  @Column({ type: "decimal", precision: 18, scale: 8 })
  gasUsed: number

  @Column({ type: "decimal", precision: 18, scale: 8 })
  gasPrice: number

  @Column({ type: "timestamp" })
  timestamp: Date

  @CreateDateColumn()
  createdAt: Date
}
