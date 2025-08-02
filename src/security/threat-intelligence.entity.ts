import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm"

export enum ThreatType {
  IP_BLACKLIST = "ip_blacklist",
  MALWARE_SIGNATURE = "malware_signature",
  SUSPICIOUS_PATTERN = "suspicious_pattern",
  KNOWN_ATTACK = "known_attack",
  IOC = "ioc", // Indicator of Compromise
}

@Entity("threat_intelligence")
@Index(["threatType", "isActive"])
@Index(["indicator"])
export class ThreatIntelligence {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({
    type: "enum",
    enum: ThreatType,
  })
  threatType: ThreatType

  @Column({ type: "varchar", length: 500 })
  indicator: string

  @Column({ type: "text", nullable: true })
  description: string

  @Column({ type: "float", default: 0 })
  confidence: number

  @Column({ type: "varchar", length: 255, nullable: true })
  source: string

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
