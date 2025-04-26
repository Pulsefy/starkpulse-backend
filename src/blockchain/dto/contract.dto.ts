export class CreateContractDto {
  address: string;
  name?: string;
  description?: string;
  abi?: any;
  monitoredEvents?: string[];
}

export class UpdateContractDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  abi?: any;
  monitoredEvents?: string[];
  lastSyncedBlock?: number;
}

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

export class ContractFilterDto {
  address?: string;
  isActive?: boolean;
} 