import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TestEnvironment } from '../utils/test-environment';
import { TestDataFactory } from '../fixtures/test-data-factory';
import { DatabaseSeeder } from '../fixtures/database-seeder';
import { Repository } from 'typeorm';
import { Transaction } from '../../src/transactions/entities/transaction.entity';
import { User } from '../../src/users/entities/user.entity';

describe('Transactions E2E', () => {
  let app: INestApplication;
  let testEnvironment: TestEnvironment;
  let transactionRepository: Repository<Transaction>;
  let userRepository: Repository<User>;
  let seeder: DatabaseSeeder;

  beforeAll(async () => {
    testEnvironment = new TestEnvironment();
    await testEnvironment.setup();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE_CONNECTION')
      .useValue(testEnvironment.dataSource)
      .overrideProvider('REDIS_CLIENT')
      .useValue(testEnvironment.redisClient)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    transactionRepository = testEnvironment.getRepository(Transaction);
    userRepository = testEnvironment.getRepository(User);
    seeder = new DatabaseSeeder(testEnvironment);
  });

  afterAll(async () => {
    await app.close();
    await testEnvironment.teardown();
  });

  beforeEach(async () => {
    await seeder.clearAll();
  });

  describe('GET /transactions', () => {
    it('should return user transactions', async () => {
      const user = await seeder.seedUser();
      const transactions = await seeder.seedTransactions(5, {
        userId: user.id,
      });

      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body).toHaveLength(5);
      expect(response.body[0]).toHaveProperty('transactionHash');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('value');
    });

    it('should filter transactions by status', async () => {
      const user = await seeder.seedUser();
      await seeder.seedTransactions(3, {
        userId: user.id,
        status: 'confirmed',
      });
      await seeder.seedTransactions(2, { userId: user.id, status: 'pending' });

      const response = await request(app.getHttpServer())
        .get('/transactions?status=confirmed')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body.every((t) => t.status === 'confirmed')).toBe(true);
    });

    it('should filter transactions by date range', async () => {
      const user = await seeder.seedUser();
      const oldDate = new Date('2023-01-01');
      const recentDate = new Date('2024-01-01');

      await seeder.seedTransactions(2, {
        userId: user.id,
        createdAt: oldDate,
      });
      await seeder.seedTransactions(3, {
        userId: user.id,
        createdAt: recentDate,
      });

      const response = await request(app.getHttpServer())
        .get('/transactions?fromDate=2023-12-01&toDate=2024-12-01')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('should sort transactions by date desc', async () => {
      const user = await seeder.seedUser();
      const transactions = [
        { createdAt: new Date('2024-01-01') },
        { createdAt: new Date('2024-01-03') },
        { createdAt: new Date('2024-01-02') },
      ];

      await seeder.seedTransactions(3, { userId: user.id }, transactions);

      const response = await request(app.getHttpServer())
        .get('/transactions?sort=createdAt:desc')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      const dates = response.body.map((t) => new Date(t.createdAt));
      expect(dates[0]).toBeGreaterThan(dates[1]);
      expect(dates[1]).toBeGreaterThan(dates[2]);
    });
  });

  describe('GET /transactions/:hash', () => {
    it('should return transaction by hash', async () => {
      const user = await seeder.seedUser();
      const transaction = TestDataFactory.createTransaction({
        userId: user.id,
      });
      const savedTransaction = await transactionRepository.save(transaction);

      const response = await request(app.getHttpServer())
        .get(`/transactions/${savedTransaction.transactionHash}`)
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body.transactionHash).toBe(
        savedTransaction.transactionHash,
      );
      expect(response.body.userId).toBe(user.id);
    });

    it('should return 404 for non-existent transaction', async () => {
      const user = await seeder.seedUser();
      const fakeHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';

      await request(app.getHttpServer())
        .get(`/transactions/${fakeHash}`)
        .set('Authorization', `Bearer ${user.id}`)
        .expect(404);
    });
  });

  describe('POST /transactions', () => {
    it('should create a new transaction', async () => {
      const user = await seeder.seedUser();
      const transactionData = {
        transactionHash:
          '0x1234567890123456789012345678901234567890123456789012345678901234',
        fromAddress: user.walletAddress,
        toAddress: '0x742d35Cc6634C0532925a3b8D3Ac65e',
      };

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.id}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.transactionHash).toBe(
        transactionData.transactionHash,
      );
      expect(response.body.status).toBe('pending');
    });

    it('should validate transaction data', async () => {
      const user = await seeder.seedUser();
      const invalidTransaction = {
        transactionHash: 'invalid-hash', // Invalid format
        fromAddress: 'invalid-address',
      };

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.id}`)
        .send(invalidTransaction)
        .expect(400);
    });
  });

  describe('PUT /transactions/:hash/status', () => {
    it('should update transaction status', async () => {
      const user = await seeder.seedUser();
      const transaction = TestDataFactory.createTransaction({
        userId: user.id,
        status: 'pending',
      });
      const savedTransaction = await transactionRepository.save(transaction);

      await request(app.getHttpServer())
        .put(`/transactions/${savedTransaction.transactionHash}/status`)
        .set('Authorization', `Bearer ${user.id}`)
        .send({ status: 'confirmed', blockNumber: 12345 })
        .expect(200);

      const updatedTransaction = await transactionRepository.findOne({
        where: { transactionHash: savedTransaction.transactionHash },
      });
      expect(updatedTransaction.status).toBe('confirmed');
      expect(updatedTransaction.blockNumber).toBe(12345);
    });
  });

  describe('GET /transactions/analytics', () => {
    it('should return transaction analytics', async () => {
      const user = await seeder.seedUser();
      await seeder.seedTransactions(10, {
        userId: user.id,
        status: 'confirmed',
      });
      await seeder.seedTransactions(5, { userId: user.id, status: 'pending' });
      await seeder.seedTransactions(2, { userId: user.id, status: 'failed' });

      const response = await request(app.getHttpServer())
        .get('/transactions/analytics')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTransactions', 17);
      expect(response.body).toHaveProperty('confirmedCount', 10);
      expect(response.body).toHaveProperty('pendingCount', 5);
      expect(response.body).toHaveProperty('failedCount', 2);
      expect(response.body).toHaveProperty('totalValue');
      expect(response.body).toHaveProperty('averageValue');
    });

    it('should return analytics for date range', async () => {
      const user = await seeder.seedUser();
      const oldDate = new Date('2023-01-01');
      const recentDate = new Date('2024-01-01');

      await seeder.seedTransactions(5, {
        userId: user.id,
        createdAt: oldDate,
        status: 'confirmed',
      });
      await seeder.seedTransactions(3, {
        userId: user.id,
        createdAt: recentDate,
        status: 'confirmed',
      });

      const response = await request(app.getHttpServer())
        .get('/transactions/analytics?fromDate=2023-12-01&toDate=2024-12-01')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      expect(response.body.totalTransactions).toBe(3);
    });
  });

  describe('Blockchain integration tests', () => {
    it('should handle blockchain transaction monitoring', async () => {
      const user = await seeder.seedUser();
      const transactionHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';

      // Mock blockchain service response
      jest
        .mocked(global.mockBlockchainService.getTransaction)
        .mockResolvedValue({
          hash: transactionHash,
          status: 'confirmed',
          blockNumber: 12345,
          confirmations: 10,
        });

      const response = await request(app.getHttpServer())
        .post('/transactions/monitor')
        .set('Authorization', `Bearer ${user.id}`)
        .send({ transactionHash })
        .expect(201);

      expect(response.body.status).toBe('monitoring');
      expect(global.mockBlockchainService.getTransaction).toHaveBeenCalledWith(
        transactionHash,
      );
    });

    it('should handle blockchain network errors', async () => {
      const user = await seeder.seedUser();
      const transactionHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';

      // Mock blockchain service error
      jest
        .mocked(global.mockBlockchainService.getTransaction)
        .mockRejectedValue(new Error('Network connection failed'));

      await request(app.getHttpServer())
        .post('/transactions/monitor')
        .set('Authorization', `Bearer ${user.id}`)
        .send({ transactionHash })
        .expect(503); // Service Unavailable
    });
  });

  describe('Performance tests', () => {
    it('should handle large transaction queries efficiently', async () => {
      const user = await seeder.seedUser();
      const startTime = Date.now();

      // Create 5000 transactions
      const transactions = TestDataFactory.createBulkTransactions(5000, {
        userId: user.id,
      });
      await transactionRepository.save(transactions);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Query with pagination should be fast
      const queryStart = Date.now();
      const response = await request(app.getHttpServer())
        .get('/transactions?page=1&limit=100')
        .set('Authorization', `Bearer ${user.id}`)
        .expect(200);

      const queryEnd = Date.now();
      expect(queryEnd - queryStart).toBeLessThan(1000); // Should complete within 1 second
      expect(response.body).toHaveLength(100);
    });

    it('should handle concurrent transaction updates', async () => {
      const user = await seeder.seedUser();
      const transactions = await seeder.seedTransactions(10, {
        userId: user.id,
        status: 'pending',
      });

      const updatePromises = transactions.map((tx) =>
        request(app.getHttpServer())
          .put(`/transactions/${tx.transactionHash}/status`)
          .set('Authorization', `Bearer ${user.id}`)
          .send({ status: 'confirmed' }),
      );

      const responses = await Promise.all(updatePromises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const confirmedCount = await transactionRepository.count({
        where: { userId: user.id, status: 'confirmed' },
      });
      expect(confirmedCount).toBe(10);
    });
  });

  describe('Error handling', () => {
    it('should handle duplicate transaction hashes', async () => {
      const user = await seeder.seedUser();
      const transactionHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';

      // Create first transaction
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.id}`)
        .send({
          transactionHash,
          fromAddress: user.walletAddress,
          toAddress: '0x742d35Cc6634C0532925a3b8D3Ac65e',
        })
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.id}`)
        .send({
          transactionHash,
          fromAddress: user.walletAddress,
          toAddress: '0x742d35Cc6634C0532925a3b8D3Ac65e',
        })
        .expect(409); // Conflict
    });

    it('should validate wallet address ownership', async () => {
      const user = await seeder.seedUser();
      const otherUser = await seeder.seedUser();

      const transaction = TestDataFactory.createTransaction({
        userId: otherUser.id,
      });
      await transactionRepository.save(transaction);

      await request(app.getHttpServer())
        .get(`/transactions/${transaction.transactionHash}`)
        .set('Authorization', `Bearer ${user.id}`)
        .expect(403); // Forbidden - user can't access other user's transactions
    });
  });
});
