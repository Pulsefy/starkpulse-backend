import { Injectable, Logger } from '@nestjs/common';
import { BlockchainAdapter } from '../interfaces/blockchain-adapter.interface';
import { Chain } from '../enums/chain.enum';
import Client from 'bitcoin-core';

@Injectable()
export class BitcoinAdapterService implements BlockchainAdapter {
  readonly chain = Chain.Bitcoin;
  private readonly logger = new Logger(BitcoinAdapterService.name);
  private client: Client;

  constructor() {
    // Prefer explicit port if provided, but fallback to host:port string if only host is given
    if (process.env.BITCOIN_RPC_HOST && process.env.BITCOIN_RPC_PORT) {
      this.client = new Client({
        host: process.env.BITCOIN_RPC_HOST,
        port: parseInt(process.env.BITCOIN_RPC_PORT),
        username: process.env.BITCOIN_RPC_USER || 'user',
        password: process.env.BITCOIN_RPC_PASSWORD || 'password',
      });
    } else if (process.env.BITCOIN_RPC_HOST) {
      // If only host is provided, assume default port 8332
      this.client = new Client({
        host: process.env.BITCOIN_RPC_HOST,
        port: 8332,
        username: process.env.BITCOIN_RPC_USER || 'user',
        password: process.env.BITCOIN_RPC_PASSWORD || 'password',
      });
    } else {
      // Default to localhost:8332
      this.client = new Client({
        host: 'localhost',
        port: 8332,
        username: process.env.BITCOIN_RPC_USER || 'user',
        password: process.env.BITCOIN_RPC_PASSWORD || 'password',
      });
    }
  }

  async getBlockNumber(): Promise<number> {
    try {
      return await this.client.command('getblockcount');
    } catch (error) {
      this.logger.error('Failed to get block number', error);
      throw error;
    }
  }

  async getContract(): Promise<any> {
    throw new Error('Contracts are not supported on Bitcoin');
  }

  async callContractMethod(): Promise<any> {
    throw new Error('Contracts are not supported on Bitcoin');
  }

  async executeContractMethod(): Promise<any> {
    throw new Error('Contracts are not supported on Bitcoin');
  }

  async getEvents(): Promise<any[]> {
    throw new Error('Events are not supported on Bitcoin');
  }

  async getTransaction(txHash: string): Promise<any> {
    try {
      return await this.client.command('getrawtransaction', txHash, true);
    } catch (error) {
      this.logger.error('Failed to get transaction', error);
      throw error;
    }
  }

  async getAccount(address: string): Promise<any> {
    try {
      // Bitcoin does not have accounts, but we can get balance for an address using an explorer or indexer
      // Here, we just return the address (real implementation would require an indexer or third-party API)
      return { address, balance: null };
    } catch (error) {
      this.logger.error('Failed to get account', error);
      throw error;
    }
  }
}