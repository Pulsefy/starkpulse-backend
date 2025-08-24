import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestEnvironment } from '../utils/test-environment';
import { DatabaseSeeder } from '../fixtures/database-seeder';
import { User } from '../../src/users/entities/user.entity';
import { PortfolioAsset } from '../../src/portfolio/entities/portfolio-asset.entity';

describe('Portfolio Management (E2E)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    await TestEnvironment.setupTestContainers();

    moduleRef = await TestEnvironment.createTestModule([AppModule]);
    app = await TestEnvironment.createTestApp(moduleRef);

    // Seed test data
    await DatabaseSeeder.seedDatabase();

    // Get test user and create auth token
    const userRepo = TestEnvironment.getRepository(User);
    testUser = await userRepo.findOne({ where: { username: 'testuser' } });

    // Mock auth token (in real scenario, this would come from auth endpoint)
    authToken = 'mock-jwt-token';
  }, 120000);

  afterAll(async () => {
    await DatabaseSeeder.clearDatabase();
    await TestEnvironment.cleanupTestContainers();
  });

  describe('Portfolio Assets API', () => {
    it('should get user portfolio assets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const asset = response.body[0];
        expect(asset).toHaveProperty('id');
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('balance');
        expect(asset).toHaveProperty('assetAddress');
      }
    });

    it('should get portfolio summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('assetCount');
      expect(typeof response.body.totalValue).toBe('number');
      expect(typeof response.body.assetCount).toBe('number');
    });

    it('should hide/unhide portfolio asset', async () => {
      // First, get an asset to test with
      const assetsResponse = await request(app.getHttpServer())
        .get('/api/v1/portfolio/assets')
        .set('Authorization', `Bearer ${authToken}`);

      if (assetsResponse.body.length === 0) {
        console.log('No assets found, skipping hide/unhide test');
        return;
      }

      const asset = assetsResponse.body[0];

      // Hide the asset
      await request(app.getHttpServer())
        .patch(`/api/v1/portfolio/assets/${asset.id}/hide`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify asset is hidden
      const hiddenAssetsResponse = await request(app.getHttpServer())
        .get('/api/v1/portfolio/assets?includeHidden=true')
        .set('Authorization', `Bearer ${authToken}`);

      const hiddenAsset = hiddenAssetsResponse.body.find(
        (a) => a.id === asset.id,
      );
      expect(hiddenAsset?.isHidden).toBe(true);

      // Unhide the asset
      await request(app.getHttpServer())
        .patch(`/api/v1/portfolio/assets/${asset.id}/unhide`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Portfolio Analytics API', () => {
    it('should get portfolio analytics summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('currentValue');
      expect(response.body).toHaveProperty('riskMetrics');
      expect(response.body).toHaveProperty('performanceMetrics');
      expect(response.body).toHaveProperty('correlations');
    });

    it('should get risk metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/analytics/risk')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: '30d',
          riskFreeRate: 0.02,
          confidenceLevel: 0.95,
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('var');
      expect(response.body).toHaveProperty('sharpeRatio');
      expect(response.body).toHaveProperty('volatility');
      expect(response.body).toHaveProperty('maxDrawdown');
      expect(response.body).toHaveProperty('beta');
      expect(response.body).toHaveProperty('sortinoRatio');

      // Validate numeric ranges
      expect(response.body.var).toBeWithinRange(0, 1);
      expect(response.body.volatility).toBeGreaterThanOrEqual(0);
      expect(response.body.maxDrawdown).toBeWithinRange(0, 1);
    });

    it('should get performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/analytics/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('totalReturn');
      expect(response.body).toHaveProperty('annualizedReturn');
      expect(response.body).toHaveProperty('dailyReturn');
      expect(response.body).toHaveProperty('weeklyReturn');
      expect(response.body).toHaveProperty('monthlyReturn');
      expect(response.body).toHaveProperty('ytdReturn');
    });

    it('should get asset correlations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/analytics/correlation')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const correlation = response.body[0];
        expect(correlation).toHaveProperty('assetAddress');
        expect(correlation).toHaveProperty('symbol');
        expect(correlation).toHaveProperty('correlation');
        expect(correlation).toHaveProperty('weight');
        expect(correlation.correlation).toBeWithinRange(-1, 1);
        expect(correlation.weight).toBeWithinRange(0, 1);
      }
    });

    it('should get optimization suggestions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/analytics/optimization')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('suggestedAllocation');
      expect(response.body).toHaveProperty('expectedReturnImprovement');
      expect(response.body).toHaveProperty('riskReduction');
      expect(response.body).toHaveProperty('rebalancingRecommendations');
      expect(Array.isArray(response.body.rebalancingRecommendations)).toBe(
        true,
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/portfolio/assets')
        .expect(401);
    });

    it('should return 400 for invalid query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/portfolio/analytics/risk')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ confidenceLevel: 1.5 }) // Invalid confidence level > 1
        .expect(400);
    });

    it('should return 404 for non-existent asset', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/portfolio/assets/non-existent-id/hide')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent portfolio requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer())
          .get('/api/v1/portfolio/summary')
          .set('Authorization', `Bearer ${authToken}`),
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust based on requirements)
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 concurrent requests

      console.log(`Concurrent requests completed in ${totalTime}ms`);
    });

    it('should respond to analytics calculations within acceptable time', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '90d' })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body).toBeDefined();
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds

      console.log(`Analytics calculation completed in ${responseTime}ms`);
    });
  });
});
