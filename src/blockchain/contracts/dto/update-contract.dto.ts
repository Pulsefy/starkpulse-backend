/* eslint-disable prettier/prettier */
export class UpdateContractDto {
    name?: string;
    description?: string;
    isActive?: boolean;
    abi?: any;
    monitoredEvents?: string[];
    lastSyncedBlock?: number;
  }
  