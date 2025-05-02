import { Test, TestingModule } from '@nestjs/testing';
import { MarketGateway } from './market.gateway';

describe('MarketGateway', () => {
  let gateway: MarketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketGateway],
    }).compile();

    gateway = module.get<MarketGateway>(MarketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
