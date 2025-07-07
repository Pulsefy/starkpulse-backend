import { Test, TestingModule } from '@nestjs/testing';
import { ApiSecurityService } from './api-security.service';

describe('ApiSecurityService', () => {
  let service: ApiSecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiSecurityService],
    }).compile();

    service = module.get<ApiSecurityService>(ApiSecurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
