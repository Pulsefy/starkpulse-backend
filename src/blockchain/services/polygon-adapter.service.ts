import { Injectable, Logger } from '@nestjs/common';
import { EthereumAdapterService } from './ethereum-adapter.service';
import { Chain } from '../enums/chain.enum';
import { ethers } from 'ethers';

@Injectable()
export class PolygonAdapterService extends EthereumAdapterService {
  readonly chain: Chain = Chain.Polygon;
  private readonly logger = new Logger(PolygonAdapterService.name);

  constructor() {
    super();
    // Override provider for Polygon
    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    // @ts-ignore
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    if (process.env.POLYGON_PRIVATE_KEY) {
      // @ts-ignore
      this.wallet = new ethers.Wallet(process.env.POLYGON_PRIVATE_KEY, this.provider);
    }
  }
} 