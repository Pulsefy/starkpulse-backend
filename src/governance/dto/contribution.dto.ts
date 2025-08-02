export class CreateContributionDto {
  type: string;
  title: string;
  description?: string;
  externalUrl?: string;
  repositoryUrl?: string;
  commitHash?: string;
  metadata?: Record<string, any>;
}

export class ReviewContributionDto {
  status: 'APPROVED' | 'REJECTED';
  baseScore?: number;
  multiplier?: number;
  reviewNotes?: string;
  tokenReward?: number;
}

export class ContributionFilterDto {
  userId?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: Date;
  dateTo?: Date;
}

export class ContributionStatsDto {
  totalContributions: number;
  approvedContributions: number;
  totalScore: number;
  totalTokensEarned: number;
  contributionsByType: Record<string, number>;
  monthlyStats: Array<{
    month: string;
    contributions: number;
    tokensEarned: number;
  }>;
}
