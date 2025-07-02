export interface BlockchainEvent {
    id: string;                   
    blockNumber: number;          
    blockHash: string;            
    transactionHash: string;      
    logIndex: number;             
    eventName: string;            
    contractAddress: string;      
    returnValues: Record<string, any>;  
    timestamp?: number;           
    processed?: boolean;         
  }