import { Injectable, Logger } from '@nestjs/common';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';
import { ethers } from 'ethers';

@Injectable()
export class EthereumAdapterService implements BlockchainAdapter {
  readonly chain = 'ethereum';
  private readonly logger = new Logger(EthereumAdapterService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;

  constructor() {
    // Use environment variable or fallback to public RPC
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    if (process.env.ETHEREUM_PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY, this.provider);
    }
  }

  async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      this.logger.error('Failed to get block number', error);
      throw error;
    }
  }

  async getContract(address: string, abi?: any): Promise<ethers.Contract> {
    try {
      return new ethers.Contract(address, abi, this.wallet || this.provider);
    } catch (error) {
      this.logger.error('Failed to get contract', error);
      throw error;
    }
  }

  async callContractMethod(address: string, abi: any, method: string, args: any[]): Promise<any> {
    try {
      const contract = await this.getContract(address, abi);
      if (!contract[method]) throw new Error(`Method ${method} not found on contract`);
      return await contract[method](...args);
    } catch (error) {
      this.logger.error(`Failed to call contract method: ${method}`, error);
      throw error;
    }
  }

  async executeContractMethod(address: string, abi: any, method: string, args: any[]): Promise<any> {
    if (!this.wallet) throw new Error('No wallet/private key configured for Ethereum execution');
    try {
      const contract = await this.getContract(address, abi);
      const connectedContract = contract.connect(this.wallet);
      if (!connectedContract[method]) throw new Error(`Method ${method} not found on contract`);
      const tx = await connectedContract[method](...args);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      this.logger.error(`Failed to execute contract method: ${method}`, error);
      throw error;
    }
  }

  async getEvents(contractAddress: string, abi: any, eventName: string, options: { fromBlock: number; toBlock?: number }): Promise<any[]> {
    try {
      const contract = await this.getContract(contractAddress, abi);
      const filter = contract.filters[eventName] ? contract.filters[eventName]() : null;
      if (!filter) throw new Error(`Event ${eventName} not found in contract ABI`);
      const fromBlock = options.fromBlock;
      const toBlock = options.toBlock || 'latest';
      const events = await contract.queryFilter(filter, fromBlock, toBlock);
      return events.map(e => ({
        blockNumber: e.blockNumber,
        blockHash: e.blockHash,
        transactionHash: e.transactionHash,
        address: e.address,
        eventName: (e as any).eventName || eventName,
        args: (e as any).args || [],
        data: e.data,
        logIndex: e.index,
        removed: e.removed,
        transactionIndex: e.transactionIndex,
      }));
    } catch (error) {
      this.logger.error(`Failed to get events for ${eventName}`, error);
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<any> {
    try {
      return await this.provider.getTransaction(txHash);
    } catch (error) {
      this.logger.error('Failed to get transaction', error);
      throw error;
    }
  }

  async getAccount(address: string): Promise<any> {
    try {
      const balance = await this.provider.getBalance(address);
      return {
        address,
        balance: ethers.formatEther(balance),
      };
    } catch (error) {
      this.logger.error('Failed to get account', error);
      throw error;
    }
  }
} 