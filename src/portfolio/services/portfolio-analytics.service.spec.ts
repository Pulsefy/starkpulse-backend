import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioAnalyticsService } from './portfolio-analytics.service';
import { PortfolioAsset } from '../entities/portfolio-asset.entity';
import { PortfolioSnapshot } from '../entities/portfolio-snapshot.entity';
import { PortfolioService } from './portfolio.service';
import { PriceService } from '../../price/price.service';

describe('PortfolioAnalyticsService', () => {
  let service: PortfolioAnalyticsService;

  const mockPortfolioAssetRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockPortfolioSnapshotRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockPortfolioService = {
    getUserPortfolio: jest.fn(),
  };

  const mockPriceService = {
    getTokenPrice: jest.fn(),
    getNftPrice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioAnalyticsService,
        {
          provide: getRepositoryToken(PortfolioAsset),
          useValue: mockPortfolioAssetRepository,
        },
        {
          provide: getRepositoryToken(PortfolioSnapshot),
          useValue: mockPortfolioSnapshotRepository,
        },
        {
          provide: PortfolioService,
          useValue: mockPortfolioService,
        },
        {
          provide: PriceService,
          useValue: mockPriceService,
        },
      ],
    }).compile();

    service = module.get<PortfolioAnalyticsService>(PortfolioAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics correctly', async () => {
      const mockSnapshots = [
        { totalValueUsd: '10000', timestamp: new Date('2024-01-01') },
        { totalValueUsd: '10500', timestamp: new Date('2024-01-02') },
        { totalValueUsd: '10200', timestamp: new Date('2024-01-03') },
      ];

      mockPortfolioSnapshotRepository.find.mockResolvedValue(mockSnapshots);

      const result = await service.calculateRiskMetrics('user123', {});

      expect(result).toBeDefined();
      expect(result.var).toBeGreaterThanOrEqual(0);
      expect(result.sharpeRatio).toBeDefined();
      expect(result.volatility).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate performance metrics correctly', async () => {
      const mockSnapshots = [
        { totalValueUsd: '10000', timestamp: new Date('2024-01-01') },
        { totalValueUsd: '10500', timestamp: new Date('2024-01-02') },
        { totalValueUsd: '10200', timestamp: new Date('2024-01-03') },
      ];

      mockPortfolioSnapshotRepository.find.mockResolvedValue(mockSnapshots);

      const result = await service.calculatePerformanceMetrics(mockSnapshots);

      expect(result).toBeDefined();
      expect(result.totalReturn).toBeDefined();
      expect(result.annualizedReturn).toBeDefined();
    });
  });
}); 