export interface StarknetEventKey {
  from_address: string;
  name: string;
}

export interface StarknetEvent {
  from_address: string;
  keys: string[];
  data: string[];
  name?: string;
}

export interface StarknetEmittedEvent extends StarknetEvent {
  block_hash: string;
  block_number: number;
  transaction_hash: string;
}

export interface EventFilter {
  contractAddresses?: string[];
  eventNames?: string[];
  fromBlock?: number;
  toBlock?: number;
}
