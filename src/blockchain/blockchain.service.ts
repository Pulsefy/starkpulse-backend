/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { CreateBlockchainDto } from './dto/create-blockchain.dto';
import { UpdateBlockchainDto } from './dto/update-blockchain.dto';
import { ContractService } from './services/contract.service';
import { retryWithBackoff } from '../common/errors/retry-with-backoff';
import { CircuitBreaker } from '../common/errors/circuit-breaker';
import { BlockchainError, BlockchainErrorCode } from '../common/errors/blockchain-error';
import { BlockchainEvent } from '../common/interfaces/BlockchainEvent';
import { EthereumAdapterService } from './services/ethereum-adapter.service';
import { BitcoinAdapterService } from './services/bitcoin-adapter.service';
import { PolygonAdapterService } from './services/polygon-adapter.service';
import { BSCAdapterService } from './services/bsc-adapter.service';
import { BlockchainAdapter } from './interfaces/blockchain-adapter.interface';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly contractBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownPeriodMs: 10000 });
  private lastProcessedBlock: number;
  private adapters: Record<string, BlockchainAdapter>;

  constructor(
    private readonly contractService: ContractService,
    private readonly ethereumAdapter: EthereumAdapterService,
    private readonly bitcoinAdapter: BitcoinAdapterService,
    private readonly polygonAdapter: PolygonAdapterService,
    private readonly bscAdapter: BSCAdapterService,
  ) {
    this.adapters = {
      ethereum: this.ethereumAdapter,
      bitcoin: this.bitcoinAdapter,
      polygon: this.polygonAdapter,
      bsc: this.bscAdapter,
    };
  }

  getAdapter(chain: string): BlockchainAdapter {
    const adapter = this.adapters[chain];
    if (!adapter) {
      this.logger.error(`Unsupported chain: ${chain}`);
      throw new BlockchainError(BlockchainErrorCode.UNSUPPORTED_CHAIN, `Unsupported chain: ${chain}`);
    }
    return adapter;
  }

  create(createBlockchainDto: CreateBlockchainDto) {
    console.log('Creating blockchain with data:', createBlockchainDto);
    return 'This action adds a new blockchain';
  }

  findAll() {
    return `This action returns all blockchain`;
  }

  findOne(id: number) {
    return `This action returns a #${id} blockchain`;
  }

  update(id: number, updateBlockchainDto: UpdateBlockchainDto) {
    return `This action updates a #${id} blockchain`;
  }

  remove(id: number) {
    return `This action removes a #${id} blockchain`;
  }

  async callContractMethod(
    chain: string,
    contractAddress: string,
    abi: any,
    method: string,
    args: any[],
  ) {
    try {
      const adapter = this.getAdapter(chain);
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          () => adapter.callContractMethod(contractAddress, abi, method, args),
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for callContractMethod: ${method} @ ${contractAddress} on ${chain} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to call contract method: ${method} @ ${contractAddress} on ${chain}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to call contract method: ${method} @ ${contractAddress} on ${chain}`,
        { contractAddress, abi, method, args, chain, originalError: error.message }
      );
    }
  }

  async executeContractMethod(
    chain: string,
    contractAddress: string,
    abi: any,
    method: string,
    args: any[],
  ) {
    try {
      const adapter = this.getAdapter(chain);
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          () => adapter.executeContractMethod(contractAddress, abi, method, args),
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for executeContractMethod: ${method} @ ${contractAddress} on ${chain} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to execute contract method: ${method} @ ${contractAddress} on ${chain}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to execute contract method: ${method} @ ${contractAddress} on ${chain}`,
        { contractAddress, abi, method, args, chain, originalError: error.message }
      );
    }
  }

  async getEvents(
    chain: string,
    contractAddress: string,
    abi: any,
    eventName: string,
    options: { fromBlock: number; toBlock?: number },
  ): Promise<BlockchainEvent[]> {
    try {
      const adapter = this.getAdapter(chain);
      const events = await this.contractBreaker.exec(() =>
        retryWithBackoff(
          () => adapter.getEvents(contractAddress, abi, eventName, options),
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getEvents: ${eventName} @ ${contractAddress} on ${chain} due to error: ${error.message}`);
            },
          }
        )
      );
      // Optionally normalize events here
      return events;
    } catch (error) {
      this.logger.error(`Failed to fetch events for ${eventName} @ ${contractAddress} on ${chain}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to get events from blockchain for ${eventName} @ ${contractAddress} on ${chain}`,
        { contractAddress, eventName, chain, error: error.message }
      );
    }
  }

  async getTransaction(chain: string, txHash: string): Promise<any> {
    try {
      const adapter = this.getAdapter(chain);
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          () => adapter.getTransaction(txHash),
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getTransaction: ${txHash} on ${chain} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to get transaction: ${txHash} on ${chain}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to get transaction: ${txHash} on ${chain}`,
        { txHash, chain, error: error.message }
      );
    }
  }

  async getAccount(chain: string, address: string): Promise<any> {
    try {
      const adapter = this.getAdapter(chain);
      return await this.contractBreaker.exec(() =>
        retryWithBackoff(
          () => adapter.getAccount(address),
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getAccount: ${address} on ${chain} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to get account: ${address} on ${chain}`, error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to get account: ${address} on ${chain}`,
        { address, chain, error: error.message }
      );
    }
  }


private parseEventData(data: string[]): Record<string, any> {
  // Implement parsing based on your event ABI structure
  // Example simple implementation:
  return {
      rawData: data
      // Add specific parsed fields based on your ABI
  };
}

  

  getLastProcessedBlock(): number {
    return this.lastProcessedBlock;
  }
}
