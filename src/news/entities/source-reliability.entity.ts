export interface SourceReliability {
  source: string;
  reliabilityScore: number;
  factualAccuracy: number;
  editorialBias: number;
  transparencyScore: number;
  historicalPerformance: number;
  lastUpdated: Date;
  articleCount: number;
  verificationStatus: 'verified' | 'pending' | 'flagged';
}