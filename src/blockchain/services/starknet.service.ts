import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Provider,
  RpcProvider,
  constants,
  Contract,
  Call,
  InvokeFunctionResponse,
  num,
} from 'starknet';
import { retryWithBackoff } from '../../common/errors/retry-with-backoff';
import { CircuitBreaker } from '../../common/errors/circuit-breaker';
import { BlockchainError, BlockchainErrorCode } from '../../common/errors/blockchain-error';
import {
  StarknetEmittedEvent,
  EventFilter,
} from '../interfaces/starknet-event.interface';

@Injectable()
export class StarknetService implements OnModuleInit {
  private readonly logger = new Logger(StarknetService.name);
  private provider: RpcProvider;
  private readonly rpcBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownPeriodMs: 10000 });

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.initializeProvider();
    try {
      await this.provider.getBlock('latest');
      this.logger.log('StarkNet RPC provider is reachable.');
    } catch (error) {
      this.logger.error('StarkNet RPC provider is unreachable.', error);
    }
  }

  private initializeProvider() {
    try {
      // Use get method instead of direct property access
      const providerUrl = this.configService.get<string>('STARKNET_NODE_URL');

      this.provider = new RpcProvider({
        nodeUrl: providerUrl,
      });

      this.logger.log(`StarkNet provider initialized with URL: ${providerUrl}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize StarkNet provider: ${error.message}`,
      );
      throw error;
    }
  }

  public getProvider(): RpcProvider {
    return this.provider;
  }

  async getLatestBlockNumber(): Promise<number> {
    try {
      return await this.rpcBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const block = await this.provider.getBlock('latest');
            return Number(block.block_number);
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getLatestBlockNumber due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error('Failed to fetch latest block number', error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        'Failed to fetch latest block number',
        { originalError: error.message }
      );
    }
  }

  async getBlockEvents(blockNumber: number): Promise<StarknetEmittedEvent[]> {
    try {
      return await this.rpcBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const blockWithTxs = await this.provider.getBlockWithTxs(blockNumber);
            return this.formatBlockEvents(blockWithTxs);
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getBlockEvents(${blockNumber}) due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(`Failed to get events for block ${blockNumber}: ${error.message}`);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Failed to get events for block ${blockNumber}`,
        { blockNumber, originalError: error.message }
      );
    }
  }

  async getEvents(filter: EventFilter): Promise<StarknetEmittedEvent[]> {
    try {
      return await this.rpcBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const { fromBlock, toBlock, contractAddresses } = filter;
            const events = await this.provider.getEvents({
              from_block: { block_number: fromBlock || 0 },
              to_block: toBlock ? { block_number: toBlock } : 'latest',
              address: contractAddresses?.[0],
              keys: [],
              chunk_size: 100,
            });
            return events.events.map((event) => ({
              from_address: event.from_address,
              keys: event.keys,
              data: event.data,
              block_hash: event.block_hash,
              block_number: Number(event.block_number),
              transaction_hash: event.transaction_hash,
            }));
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getEvents due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error('Failed to fetch events', error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        'Failed to fetch events',
        { filter, originalError: error.message }
      );
    }
  }

  async submitTransaction(
    call: Call,
    privateKey: string,
  ): Promise<InvokeFunctionResponse> {
    try {
      this.logger.log('submitTransaction implementation pending');
      throw new Error('Account signing not yet implemented.');
    } catch (error) {
      this.logger.error('Failed to submit transaction', error);
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        'Failed to submit transaction',
        { call, originalError: error.message }
      );
    }
  }

  async readContract(
    contractAddress: string,
    abi: any,
    functionName: string,
    calldata: any[],
  ) {
    try {
      return await this.rpcBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const contract = new Contract(abi, contractAddress, this.provider);
            const result = await contract.call(functionName, calldata);
            return result;
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for readContract(${functionName}) @ ${contractAddress} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(
        `Contract read error: ${functionName} @ ${contractAddress}`,
        error,
      );
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Contract read error: ${functionName} @ ${contractAddress}`,
        { contractAddress, functionName, calldata, originalError: error.message }
      );
    }
  }

  async getErc20Balance(
    contractAddress: string,
    userAddress: string,
    abi: any,
  ): Promise<string> {
    try {
      return await this.rpcBreaker.exec(() =>
        retryWithBackoff(
          async () => {
            const contract = new Contract(abi, contractAddress, this.provider);
            const result = await contract.call('balanceOf', [userAddress]);
            const balance = result[0];
            return num.toHex(balance);
          },
          {
            retries: 3,
            initialDelayMs: 500,
            maxDelayMs: 4000,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retry ${attempt} for getErc20Balance(${userAddress}) @ ${contractAddress} due to error: ${error.message}`);
            },
          }
        )
      );
    } catch (error) {
      this.logger.error(
        `Error getting ERC20 balance for ${userAddress} @ ${contractAddress}`,
        error,
      );
      throw new BlockchainError(
        BlockchainErrorCode.EXECUTION_FAILED,
        `Error getting ERC20 balance for ${userAddress} @ ${contractAddress}`,
        { contractAddress, userAddress, originalError: error.message }
      );
    }
  }

  // Mock fallback implementations (used for UI previews or testing)
  getUserTokens(walletAddress: string) {
    this.logger.log(`Getting tokens for wallet ${walletAddress}`);

    try {
      return [
        {
          address:
            '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
          balance: '1000000000000000000',
          logoURI: 'https://ethereum.org/eth-logo.svg',
        },
      ];
    } catch (error) {
      this.logger.error(
        `Error getting tokens for wallet ${walletAddress}: ${error.message}`,
      );
      throw error;
    }
  }

  getUserNfts(walletAddress: string) {
    this.logger.log(`Getting NFTs for wallet ${walletAddress}`);

    try {
      return [
        {
          contractAddress: '0x123abc...',
          tokenId: '1',
          name: 'Example NFT',
          imageUrl: 'https://example.com/nft.png',
          metadata: {
            attributes: [
              { trait_type: 'Background', value: 'Blue' },
              { trait_type: 'Rarity', value: 'Rare' },
            ],
          },
        },
      ];
    } catch (error) {
      this.logger.error(
        `Error getting NFTs for wallet ${walletAddress}: ${error.message}`,
      );
      throw error;
    }
  }

  private formatBlockEvents(blockWithTxs: any): StarknetEmittedEvent[] {
    const events: StarknetEmittedEvent[] = [];

    if (blockWithTxs?.transactions) {
      for (const tx of blockWithTxs.transactions) {
        if (tx.events) {
          for (const event of tx.events) {
            events.push({
              from_address: event.from_address,
              keys: event.keys,
              data: event.data,
              block_hash: blockWithTxs.block_hash,
              block_number: Number(blockWithTxs.block_number),
              transaction_hash: tx.transaction_hash,
            });
          }
        }
      }
    }

    return events;
  }
}
