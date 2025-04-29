import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcProvider, constants } from 'starknet';
import { StarknetEmittedEvent } from 'src/interfaces/starknet-event.interface';
import { EventFilter } from 'src/interfaces/starknet-event';

@Injectable()
export class StarknetService {
  private readonly logger = new Logger(StarknetService.name);
  private provider: RpcProvider;

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

  // Initializes the provider with network configuration
  private initializeProvider(): void {
    try {
      const providerUrl = this.configService.get<string>('STARKNET_NODE_URL');
      const network = this.configService.get<string>('STARKNET_NETWORK', 'testnet');

      this.provider = new RpcProvider({
        nodeUrl: providerUrl,
        chainId: network === 'mainnet'
          ? constants.StarknetChainId.SN_MAIN
          : constants.StarknetChainId.SN_GOERLI,
      });

      this.logger.log(`StarkNet provider initialized for ${network}`);
    } catch (error) {
      this.logger.error(`Failed to initialize StarkNet provider: ${error.message}`);
      throw error;
    }
  }

  // Returns the initialized provider
  public getProvider(): RpcProvider {
    return this.provider;
  }

  // Gets the latest block number
  async getLatestBlockNumber(): Promise<number> {
    try {
      const block = await this.provider.getBlock('latest');
      return Number(block.block_number);
    } catch (error) {
      this.logger.error(`Failed to get latest block number: ${error.message}`);
      throw error;
    }
  }

  // Fetches events for a specific block number
  async getBlockEvents(blockNumber: number): Promise<StarknetEmittedEvent[]> {
    try {
      const blockWithTxs = await this.provider.getBlockWithTxs(blockNumber);
      return this.formatBlockEvents(blockWithTxs);
    } catch (error) {
      this.logger.error(`Failed to get events for block ${blockNumber}: ${error.message}`);
      throw error;
    }
  }

  // Retrieves events based on the provided filter
  async getEvents(filter: EventFilter): Promise<StarknetEmittedEvent[]> {
    try {
      const { fromBlock = 0, toBlock, contractAddresses = [] } = filter;

      const events = await this.provider.getEvents({
        from_block: { block_number: fromBlock },
        to_block: toBlock !== undefined ? { block_number: toBlock } : undefined,
        address: contractAddresses[0], // Ensure we access the first element safely
        keys: [], // Empty array if keys are not needed, this can be parameterized later
        chunk_size: 1000, // Ensuring chunk size is appropriately set
      });

      return events.events.map((event) => ({
        from_address: event.from_address,
        keys: event.keys,
        data: event.data,
        block_hash: event.block_hash,
        block_number: Number(event.block_number),
        transaction_hash: event.transaction_hash,
      }));
    } catch (error) {
      this.logger.error(`Failed to get events with filter ${JSON.stringify(filter)}: ${error.message}`);
      throw error;
    }
  }

  // Formats the block events from transactions
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

  // Mock method to get user tokens
  getUserTokens(walletAddress: string): any[] {
    this.logger.log(`Getting tokens for wallet ${walletAddress}`);
    try {
      // Stubbed mock data (to be replaced with real implementation)
      return [
        {
          address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
          balance: '1000000000000000000',
          logoURI: 'https://ethereum.org/eth-logo.svg',
        },
      ];
    } catch (error) {
      this.logger.error(`Error getting tokens for wallet ${walletAddress}: ${error.message}`);
      throw error;
    }
  }

  // Mock method to get user NFTs
  getUserNfts(walletAddress: string): any[] {
    this.logger.log(`Getting NFTs for wallet ${walletAddress}`);
    try {
      // Stubbed mock data (to be replaced with real implementation)
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
      this.logger.error(`Error getting NFTs for wallet ${walletAddress}: ${error.message}`);
      throw error;
    }
  }
}
