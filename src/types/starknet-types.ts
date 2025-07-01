// types/starknet-types.ts
export interface StarkNetEvent {
    event_name: string;
    transaction_hash: string;
    block_number: number;
    block_hash: string;
    data: string[];
    keys: string[];
    address: string;
  }