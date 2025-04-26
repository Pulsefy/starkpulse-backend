import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider, RpcProvider, constants } from 'starknet';
import { StarknetEmittedEvent, EventFilter } from '../interfaces/starknet-event.interface';

@Injectable()
export class StarknetService {
  private readonly logger = new Logger(StarknetService.name);
  private provider: Provider;

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

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

  public getProvider(): Provider {
    return this.provider;
  }

  async getLatestBlockNumber(): Promise<number> {
    try {
      const block = await this.provider.getBlock('latest');
      return Number(block.block_number);
    } catch (error) {
      this.logger.error(`Failed to get latest block number: ${error.message}`);
      throw error;
    }
  }

  async getBlockEvents(blockNumber: number): Promise<StarknetEmittedEvent[]> {
    try {
      const events = await this.provider.getBlockWithTxs(blockNumber);
      return this.formatBlockEvents(events);
    } catch (error) {
      this.logger.error(`Failed to get events for block ${blockNumber}: ${error.message}`);
      throw error;
    }
  }

  async getEvents(filter: EventFilter): Promise<StarknetEmittedEvent[]> {
    try {
      const { fromBlock, toBlock, contractAddresses } = filter;
      
      const events = await this.provider.getEvents({
        from_block: { block_number: fromBlock || 0 },
        to_block: toBlock ? { block_number: toBlock } : 'latest',
        address: contractAddresses && contractAddresses.length > 0 ? contractAddresses[0] : undefined,
        keys: [],
      });
      
      return events.events.map(event => ({
        from_address: event.from_address,
        keys: event.keys,
        data: event.data,
        block_hash: event.block_hash,
        block_number: Number(event.block_number),
        transaction_hash: event.transaction_hash,
      }));
    } catch (error) {
      this.logger.error(`Failed to get events with filter: ${JSON.stringify(filter)}: ${error.message}`);
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

  getUserTokens(walletAddress: string) {
    this.logger.log(`Getting tokens for wallet ${walletAddress}`);
    try {
      // Mock implementation
      return [
        {
          address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
          balance: '1000000000000000000', // 1 ETH
          logoURI: 'https://ethereum.org/eth-logo.svg',
        },
      ];
    } catch (error) {
      this.logger.error(`Error getting tokens for wallet ${walletAddress}`, error);
      throw error;
    }
  }

  getUserNfts(walletAddress: string) {
    this.logger.log(`Getting NFTs for wallet ${walletAddress}`);
    try {
      // Mock implementation
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
      this.logger.error(`Error getting NFTs for wallet ${walletAddress}`, error);
      throw error;
    }
  }
}
