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
import retry from 'ts-retry-promise';
import {
  StarknetEmittedEvent,
  EventFilter,
} from '../interfaces/starknet-event.interface';

@Injectable()
export class StarknetService implements OnModuleInit {
  private readonly logger = new Logger(StarknetService.name);
  private provider: Provider;

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

  async onModuleInit() {
    try {
      await this.provider.getBlock('latest');
      this.logger.log('StarkNet RPC provider is reachable.');
    } catch (error) {
      this.logger.error('StarkNet RPC provider is unreachable.', error);
    }
  }

  private initializeProvider(): void {
    try {
      const providerUrl = this.configService.get<string>('STARKNET_NODE_URL');
      const network = this.configService.get<string>(
        'STARKNET_NETWORK',
        'testnet',
      );
      this.provider = new RpcProvider({
        nodeUrl: providerUrl,
        chainId:
          network === 'mainnet'
            ? constants.StarknetChainId.SN_MAIN
            : constants.StarknetChainId.SN_GOERLI,
      });

      this.logger.log(`StarkNet provider initialized for ${network}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize StarkNet provider: ${error.message}`,
      );
      throw error;
    }
  }

  public getProvider(): Provider {
    return this.provider;
  }

  async getLatestBlockNumber(): Promise<number> {
    return retry(
      async () => {
        const block = await this.provider.getBlock('latest');
        return Number(block.block_number);
      },
      { retries: 3, delay: 1000 },
    ).catch((err) => {
      this.logger.error('Failed to fetch latest block number', err);
      throw err;
    });
  }

  async getBlockEvents(blockNumber: number): Promise<StarknetEmittedEvent[]> {
    try {
      const blockWithTxs = await this.provider.getBlockWithTxs(blockNumber);
      return this.formatBlockEvents(blockWithTxs);
    } catch (error) {
      this.logger.error(
        `Failed to get events for block ${blockNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  async getEvents(filter: EventFilter): Promise<StarknetEmittedEvent[]> {
    return retry(
      async () => {
        const { fromBlock, toBlock, contractAddresses } = filter;

        const events = await this.provider.getEvents({
          from_block: { block_number: fromBlock || 0 },
          to_block: toBlock ? { block_number: toBlock } : 'latest',
          address: contractAddresses?.[0],
          keys: [],
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
      { retries: 3, delay: 1000 },
    ).catch((err) => {
      this.logger.error('Failed to fetch events', err);
      throw err;
    });
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
      throw error;
    }
  }

  async readContract(
    contractAddress: string,
    abi: any,
    functionName: string,
    calldata: any[],
  ) {
    try {
      const contract = new Contract(abi, contractAddress, this.provider);
      const result = await contract.call(functionName, calldata);
      return result;
    } catch (error) {
      this.logger.error(
        `Contract read error: ${functionName} @ ${contractAddress}`,
        error,
      );
      throw error;
    }
  }

  async getErc20Balance(
    contractAddress: string,
    userAddress: string,
    abi: any,
  ): Promise<string> {
    try {
      const contract = new Contract(abi, contractAddress, this.provider);
      const { balance } = await contract.call('balanceOf', [userAddress]);
      return num.toHex(balance);
    } catch (error) {
      this.logger.error(
        `Error getting ERC20 balance for ${userAddress} @ ${contractAddress}`,
        error,
      );
      throw error;
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
