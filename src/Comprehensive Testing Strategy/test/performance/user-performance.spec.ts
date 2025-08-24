import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UserModule } from '../../src/user/user.module';
import { performance } from 'perf_hooks';

describe('User Performance Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UserModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Tests', () => {
    it('should create user within acceptable time', async () => {
      const createUserDto = {
        name: 'Performance Test User',
        email: 'perf@test.com',
        phone: '1234567890',
      };

      const startTime = performance.now();
      
      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100); // 100ms threshold
    });

    it('should handle bulk user creation efficiently', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        name: `Bulk User ${i}`,
        email: `bulk${i}@test.com`,
        phone: `123456789${i}`,
      }));

      const startTime = performance.now();

      const promises = users.map(user =>
        request(app.getHttpServer())
          .post('/users')
          .send(user)
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // 1 second for 10 users
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 100 operations
      for (let i = 0; i < 100; i++) {
        const createUserDto = {
          name: `Memory Test User ${i}`,
          email: `memory${i}@test.com`,
          phone: '1234567890',
        };

        await request(app.getHttpServer())
          .post('/users')
          .send(createUserDto);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
