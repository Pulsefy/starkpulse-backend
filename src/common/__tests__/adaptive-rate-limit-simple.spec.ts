import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnhancedSystemHealthService } from '../services/enhanced-system-health.service';
import { RateLimitMetricsStore } from '../stores/rate-limit-metrics.store';

describe('Adaptive Rate Limiting - Simple Tests', () => {
  let systemHealthService: EnhancedSystemHealthService;
  let metricsStore: RateLimitMetricsStore;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedSystemHealthService,
        RateLimitMetricsStore,
      ],
    }).compile();

    systemHealthService = module.get<EnhancedSystemHealthService>(EnhancedSystemHealthService);
    metricsStore = module.get<RateLimitMetricsStore>(RateLimitMetricsStore);
  });

  describe('EnhancedSystemHealthService', () => {
    it('should be defined', () => {
      expect(systemHealthService).toBeDefined();
    });

    it('should provide system metrics', async () => {
      const metrics = await systemHealthService.getSystemMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.load).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      
      expect(typeof metrics.cpu.usage).toBe('number');
      expect(typeof metrics.memory.usage).toBe('number');
      expect(Array.isArray(metrics.cpu.loadAverage)).toBe(true);
    });

    it('should detect system load correctly', () => {
      // Mock high CPU and memory usage
      jest.spyOn(systemHealthService, 'getCpuUsage').mockReturnValue(90);
      jest.spyOn(systemHealthService, 'getMemoryUsage').mockReturnValue(85);

      const isUnderLoad = systemHealthService.isSystemUnderLoad(85, 80);
      expect(isUnderLoad).toBe(true);
    });

    it('should calculate load factor', () => {
      jest.spyOn(systemHealthService, 'getCpuUsage').mockReturnValue(75);
      jest.spyOn(systemHealthService, 'getMemoryUsage').mockReturnValue(60);
      jest.spyOn(systemHealthService, 'getSystemLoad').mockReturnValue(1.2);

      const loadFactor = systemHealthService.getLoadFactor();
      expect(loadFactor).toBeGreaterThan(0);
      expect(loadFactor).toBeLessThanOrEqual(1);
    });
  });

  describe('RateLimitMetricsStore', () => {
    it('should be defined', () => {
      expect(metricsStore).toBeDefined();
    });

    it('should record and retrieve metrics', async () => {
      const metrics = {
        userId: 123,
        bucketSize: 100,
        refillRate: 10,
        tokensLeft: 95,
        lastRequestTime: new Date(),
        deniedRequests: 0,
        totalRequests: 1,
      };

      const systemMetrics = {
        cpuUsage: 50,
        memoryUsage: 60,
        adaptiveMultiplier: 1.0,
      };

      await metricsStore.recordMetrics('test:key', metrics, systemMetrics);

      const retrievedMetrics = await metricsStore.getMetricsByKey('test:key');
      expect(retrievedMetrics).toBeDefined();
      expect(retrievedMetrics?.userId).toBe(123);
      expect(retrievedMetrics?.systemCpuLoad).toBe(50);
      expect(retrievedMetrics?.systemMemoryLoad).toBe(60);
      expect(retrievedMetrics?.adaptiveMultiplier).toBe(1.0);
    });

    it('should provide system-wide metrics', async () => {
      const metrics = {
        userId: 123,
        bucketSize: 100,
        refillRate: 10,
        tokensLeft: 95,
        lastRequestTime: new Date(),
        deniedRequests: 1,
        totalRequests: 10,
      };

      const systemMetrics = {
        cpuUsage: 50,
        memoryUsage: 60,
        adaptiveMultiplier: 1.0,
      };

      await metricsStore.recordMetrics('test:key', metrics, systemMetrics);

      const systemMetricsResult = await metricsStore.getSystemMetrics();
      expect(systemMetricsResult.totalUsers).toBe(1);
      expect(systemMetricsResult.totalRequests).toBe(10);
      expect(systemMetricsResult.totalDeniedRequests).toBe(1);
      expect(systemMetricsResult.averageCpuLoad).toBe(50);
      expect(systemMetricsResult.averageMemoryLoad).toBe(60);
      expect(systemMetricsResult.averageAdaptiveMultiplier).toBe(1.0);
    });

    it('should handle multiple users', async () => {
      const user1Metrics = {
        userId: 123,
        bucketSize: 100,
        refillRate: 10,
        tokensLeft: 95,
        lastRequestTime: new Date(),
        deniedRequests: 1,
        totalRequests: 10,
      };

      const user2Metrics = {
        userId: 456,
        bucketSize: 200,
        refillRate: 20,
        tokensLeft: 180,
        lastRequestTime: new Date(),
        deniedRequests: 2,
        totalRequests: 15,
      };

      const systemMetrics = {
        cpuUsage: 50,
        memoryUsage: 60,
        adaptiveMultiplier: 1.0,
      };

      await metricsStore.recordMetrics('user:123', user1Metrics, systemMetrics);
      await metricsStore.recordMetrics('user:456', user2Metrics, systemMetrics);

      const systemMetricsResult = await metricsStore.getSystemMetrics();
      expect(systemMetricsResult.totalUsers).toBe(2);
      expect(systemMetricsResult.totalRequests).toBe(25);
      expect(systemMetricsResult.totalDeniedRequests).toBe(3);
    });
  });
}); 