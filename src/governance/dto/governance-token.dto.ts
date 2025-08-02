export class CreateGovernanceTokenDto {
  userId: string;
  balance?: number;
  stakedBalance?: number;
  lockedBalance?: number;
  tokenType?: string;
  votingPower?: number;
  delegatedPower?: number;
  delegatedTo?: string;
  metadata?: Record<string, any>;
}

export class UpdateGovernanceTokenDto {
  balance?: number;
  stakedBalance?: number;
  lockedBalance?: number;
  votingPower?: number;
  delegatedPower?: number;
  delegatedTo?: string;
  metadata?: Record<string, any>;
}
