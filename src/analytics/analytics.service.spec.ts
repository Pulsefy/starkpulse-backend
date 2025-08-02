import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';

const mockSnapshots = [
  { id: '1', userId: 'u1', totalValueUsd: '100', assetBreakdown: {}, timestamp: new Date('2024-01-01'), chain: 'ethereum' },
  { id: '2', userId: 'u1', totalValueUsd: '120', assetBreakdown: {}, timestamp: new Date('2024-01-02'), chain: 'ethereum' },
  { id: '3', userId: 'u1', totalValueUsd: '200', assetBreakdown: {}, timestamp: new Date('2024-01-01'), chain: 'bitcoin' },
  { id: '4', userId: 'u1', totalValueUsd: '220', assetBreakdown: {}, timestamp: new Date('2024-01-02'), chain: 'bitcoin' },
];

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    // @ts-ignore
    service.snapshotRepo = { find: jest.fn().mockResolvedValue(mockSnapshots) };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return analytics grouped by chain', async () => {
    const result = await service.getUserAnalytics('u1');
    expect(result).not.toBeNull();
    if (!result) return;
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty('chain');
    expect(result[0]).toHaveProperty('roi');
    expect(result[0]).toHaveProperty('snapshots');
    expect(result[1]).toHaveProperty('chain');
    expect(result[1]).toHaveProperty('roi');
    expect(result[1]).toHaveProperty('snapshots');
    const chains = result.map(r => r.chain);
    expect(chains).toContain('ethereum');
    expect(chains).toContain('bitcoin');
  });
});
