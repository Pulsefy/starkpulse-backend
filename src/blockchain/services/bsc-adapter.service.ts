import { Injectable, Logger } from '@nestjs/common';
import { EthereumAdapterService } from './ethereum-adapter.service';
import { Chain } from '../enums/chain.enum';
import { ethers } from 'ethers';

@Injectable()
export class BSCAdapterService extends EthereumAdapterService {
  readonly chain: Chain = Chain.BSC;
  private readonly logger = new Logger(BSCAdapterService.name);

  constructor() {
    super();
    // Override provider for BSC
    const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';
    // @ts-ignore
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    if (process.env.BSC_PRIVATE_KEY) {
      // @ts-ignore
      this.wallet = new ethers.Wallet(process.env.BSC_PRIVATE_KEY, this.provider);
    }
  }
} 