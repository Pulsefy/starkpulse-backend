/* eslint-disable prettier/prettier */
export class ContractDto {
    id: string;
    address: string;
    name?: string;
    description?: string;
    isActive: boolean;
    monitoredEvents: string[];
    lastSyncedBlock?: number;
    createdAt: Date;
    updatedAt: Date;
  }
  