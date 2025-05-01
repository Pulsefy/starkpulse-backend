import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PriceFetcherService {
  private readonly logger = new Logger(PriceFetcherService.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3/simple/price';

  async getTokenPrice(symbol: string): Promise<number> {
    try {
      const coinId = this.mapSymbolToId(symbol);

      const response = await axios.get(`${this.baseUrl}?ids=${coinId}&vs_currencies=usd`);
      const price = response.data[coinId]?.usd;

      if (typeof price !== 'number') {
        throw new Error(`Price for ${symbol} not found`);
      }

      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}: ${error.message}`);
      throw error;
    }
  }

  // CoinGecko uses IDs like 'starknet', 'steller', etc.
  private mapSymbolToId(symbol: string): string {
    const map: Record<string, string> = {
      XLM: 'steller',
      STRK: 'starknet',
      USDC: 'usd-coin',
      BTC: 'bitcoin',
      // Add more mappings as needed
    };

    const coinId = map[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Unsupported token symbol: ${symbol}`);
    }

    return coinId;
  }
}
