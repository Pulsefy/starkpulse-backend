export interface BlockchainAdapter {
  readonly chain: string;

  getBlockNumber(): Promise<number>;
  getContract(address: string, abi?: any): Promise<any>;
  callContractMethod(address: string, abi: any, method: string, args: any[]): Promise<any>;
  executeContractMethod(address: string, abi: any, method: string, args: any[]): Promise<any>;
  getEvents(
    contractAddress: string,
    abi: any,
    eventName: string,
    options: { fromBlock: number; toBlock?: number }
  ): Promise<any[]>;
  getTransaction(txHash: string): Promise<any>;
  getAccount(address: string): Promise<any>;
} 