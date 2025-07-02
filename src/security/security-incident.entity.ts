import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from "typeorm"
import { SecurityEvent } from "./security-event.entity"

export enum IncidentSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum IncidentStatus {
  OPEN = "open",
  INVESTIGATING = "investigating",
  CONTAINED = "contained",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

@Entity("security_incidents")
export class SecurityIncident {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text" })
  description: string

  @Column({
    type: "enum",
    enum: IncidentSeverity,
  })
  severity: IncidentSeverity

  @Column({
    type: "enum",
    enum: IncidentStatus,
    default: IncidentStatus.OPEN,
  })
  status: IncidentStatus

  @Column({ type: "uuid", nullable: true })
  assignedTo: string

  @Column({ type: "jsonb", nullable: true })
  affectedSystems: string[]

  @Column({ type: "jsonb", nullable: true })
  responseActions: string[]

  @Column({ type: "timestamp", nullable: true })
  detectedAt: Date

  @Column({ type: "timestamp", nullable: true })
  resolvedAt: Date

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @OneToMany(
    () => SecurityEvent,
    (event) => event.correlationId,
  )
  @JoinColumn({ name: "correlationId", referencedColumnName: "id" })
  relatedEvents: SecurityEvent[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
