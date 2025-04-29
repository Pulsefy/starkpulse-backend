import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider } from 'starknet';

@Injectable()
export class StarknetService {
  private readonly logger = new Logger(StarknetService.name);
  private provider: Provider;

  constructor(private configService: ConfigService) {
    const nodeUrl = this.configService.get<string>('STARKNET_NODE_URL');

    this.provider = new Provider({
      sequencer: {
        baseUrl: nodeUrl!,
        // feederGatewayUrl: nodeUrl!,
        // chainId: 'starknet-testnet',
      },
    });
  }

  getUserTokens(walletAddress: string): any[] {
    this.logger.log(`Getting tokens for wallet ${walletAddress}`);

    // Return mock tokens
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
  }

  getUserNfts(walletAddress: string): any[] {
    this.logger.log(`Getting NFTs for wallet ${walletAddress}`);

    // Return mock NFTs
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
  }
}
