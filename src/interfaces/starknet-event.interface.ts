export interface StarknetEmittedEvent {
    from_address: string;
    keys: string[];
    data: string[];
    block_hash: string;
    block_number: number;
    transaction_hash: string;
  }