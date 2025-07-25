import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { EthereumAdapterService } from './services/ethereum-adapter.service';
import { BitcoinAdapterService } from './services/bitcoin-adapter.service';
import { PolygonAdapterService } from './services/polygon-adapter.service';
import { BSCAdapterService } from './services/bsc-adapter.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        EthereumAdapterService,
        BitcoinAdapterService,
        PolygonAdapterService,
        BSCAdapterService,
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return adapter for supported chain', () => {
    expect(() => service.getAdapter('ethereum')).not.toThrow();
    expect(() => service.getAdapter('bitcoin')).not.toThrow();
    expect(() => service.getAdapter('polygon')).not.toThrow();
    expect(() => service.getAdapter('bsc')).not.toThrow();
  });

  it('should throw for unsupported chain', () => {
    expect(() => service.getAdapter('unknownchain')).toThrow();
  });
});
