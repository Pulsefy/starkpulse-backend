import { Chain } from '../enums/chain.enum';

export interface NormalizedEvent {
  chain: Chain;
  contractAddress: string;
  eventName: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  data: Record<string, any>;
  timestamp: number;
} 