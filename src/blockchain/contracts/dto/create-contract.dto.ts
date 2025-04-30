/* eslint-disable prettier/prettier */
export class CreateContractDto {
    address: string;
    name?: string;
    description?: string;
    abi?: any;
    monitoredEvents?: string[];
  }
  