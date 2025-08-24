export class CreateProposalDto {
  title: string;
  description: string;
  type?: string;
  votingPeriodDays?: number;
  quorumRequired?: number;
  executionData?: string;
  metadata?: Record<string, any>;
}

export class UpdateProposalDto {
  title?: string;
  description?: string;
  status?: string;
  executionData?: string;
  metadata?: Record<string, any>;
}

export class CastVoteDto {
  proposalId: string;
  voteType: 'FOR' | 'AGAINST' | 'ABSTAIN';
  reason?: string;
  metadata?: Record<string, any>;
}

export class ProposalFilterDto {
  status?: string;
  type?: string;
  proposerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
