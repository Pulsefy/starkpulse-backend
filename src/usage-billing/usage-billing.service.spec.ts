import { Test, TestingModule } from '@nestjs/testing';
import { UsageBillingService } from './usage-billing.service';

describe('UsageBillingService', () => {
  let service: UsageBillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsageBillingService],
    }).compile();

    service = module.get<UsageBillingService>(UsageBillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
