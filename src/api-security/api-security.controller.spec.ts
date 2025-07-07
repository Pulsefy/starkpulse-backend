import { Test, TestingModule } from '@nestjs/testing';
import { ApiSecurityController } from './api-security.controller';
import { ApiSecurityService } from './api-security.service';

describe('ApiSecurityController', () => {
  let controller: ApiSecurityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiSecurityController],
      providers: [ApiSecurityService],
    }).compile();

    controller = module.get<ApiSecurityController>(ApiSecurityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
