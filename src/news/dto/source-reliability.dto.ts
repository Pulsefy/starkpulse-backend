export class SourceReliabilityDto {
  source: string;
  reliabilityScore: number;
  factualAccuracy: number;
  editorialBias: number;
  transparencyScore: number;
  historicalPerformance: number;
  verificationStatus: 'verified' | 'pending' | 'flagged';
  lastUpdated: Date;
}