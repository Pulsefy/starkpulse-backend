import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { ContentItem } from "./content-item.entity"

@Entity("quality_metrics")
export class QualityMetric {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  contentItemId: string

  @ManyToOne(
    () => ContentItem,
    (content) => content.qualityMetrics,
  )
  @JoinColumn({ name: "contentItemId" })
  contentItem: ContentItem

  @Column({ type: "decimal", precision: 3, scale: 2 })
  overallScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  accuracyScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  reliabilityScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  biasScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  clarityScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  completenessScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  timelinessScore: number

  @Column({ type: "decimal", precision: 3, scale: 2 })
  sourceCredibilityScore: number

  @Column({ type: "int" })
  totalValidations: number

  @Column({ type: "decimal", precision: 5, scale: 2 })
  consensusStrength: number

  @Column({ type: "jsonb", nullable: true })
  detailedMetrics: Record<string, any>

  @CreateDateColumn()
  createdAt: Date
}
