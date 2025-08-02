/* eslint-disable prettier/prettier */
export class CreateEventDto {
  name: string;
  description?: string;
  contractId: string;
  data: any;
  blockNumber?: number;
  blockHash?: string;
  transactionHash?: string;
  sequence?: number;
}

export class UpdateEventDto {
  description?: string;
  isProcessed?: boolean;
}

export class EventDto {
  id: string;
  name: string;
  description?: string;
  data: any;
  contractId: string;
  blockNumber?: number;
  blockHash?: string;
  transactionHash?: string;
  sequence?: number;
  isProcessed: boolean;
  createdAt: Date;
}

export class EventFilterDto {
  contractId?: string;
  name?: string;
  isProcessed?: boolean;
  fromBlockNumber?: number;
  toBlockNumber?: number;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
} 