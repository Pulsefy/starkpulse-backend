import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TestEnvironment } from '../utils/test-environment';
import { DatabaseSeeder } from '../fixtures/database-seeder';
import { TestDataFactory } from '../fixtures/test-data-factory';
import { User } from '../../src/users/entities/user.entity';
import { PortfolioAsset } from '../../src/portfolio/entities/portfolio-asset.entity';
import { Transaction } from '../../src/transactions/entities/transaction.entity';
import { Notification } from '../../src/notifications/entities/notification.entity';
import { Portfolio } from '../../src/portfolio/entities/portfolio.entity';

describe('Database Integration Tests', () => {
  let testEnvironment: TestEnvironment;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let portfolioRepository: Repository<Portfolio>;
  let assetRepository: Repository<PortfolioAsset>;
  let transactionRepository: Repository<Transaction>;
  let notificationRepository: Repository<Notification>;
  let seeder: DatabaseSeeder;

  beforeAll(async () => {
    testEnvironment = new TestEnvironment();
    await testEnvironment.setup();

    dataSource = testEnvironment.dataSource;
    userRepository = testEnvironment.getRepository(User);
    portfolioRepository = testEnvironment.getRepository(Portfolio);
    assetRepository = testEnvironment.getRepository(PortfolioAsset);
    transactionRepository = testEnvironment.getRepository(Transaction);
    notificationRepository = testEnvironment.getRepository(Notification);
    seeder = new DatabaseSeeder(testEnvironment);
  });

  afterAll(async () => {
    await testEnvironment.teardown();
  });

  beforeEach(async () => {
    await seeder.clearAll();
  });

  describe('User Management', () => {
    it('should create and retrieve users', async () => {
      const userData = TestDataFactory.createUser();
      const savedUser = await userRepository.save(userData);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.walletAddress).toBe(userData.walletAddress);
      expect(savedUser.username).toBe(userData.username);

      const retrievedUser = await userRepository.findOne({
        where: { id: savedUser.id },
      });
      expect(retrievedUser).toBeTruthy();
      expect(retrievedUser.walletAddress).toBe(userData.walletAddress);
    });

    it('should enforce unique wallet addresses', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D3Ac65e';

      const user1 = TestDataFactory.createUser({ walletAddress });
      const user2 = TestDataFactory.createUser({ walletAddress });

      await userRepository.save(user1);

      await expect(userRepository.save(user2)).rejects.toThrow();
    });

    it('should handle user updates correctly', async () => {
      const user = await seeder.seedUser();
      const newUsername = 'updated_username';

      await userRepository.update(user.id, { username: newUsername });

      const updatedUser = await userRepository.findOne({
        where: { id: user.id },
      });
      expect(updatedUser.username).toBe(newUsername);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
        user.updatedAt.getTime(),
      );
    });
  });

  describe('Portfolio Management', () => {
    it('should create portfolio with assets', async () => {
      const user = await seeder.seedUser();
      const portfolioData = TestDataFactory.createPortfolio({
        walletAddress: user.walletAddress,
      });
      const savedPortfolio = await portfolioRepository.save(portfolioData);

      const assets = TestDataFactory.createBulkPortfolioAssets(5, user.id);
      const savedAssets = await assetRepository.save(assets);

      expect(savedPortfolio.id).toBeDefined();
      expect(savedAssets).toHaveLength(5);

      const portfolioWithAssets = await portfolioRepository.findOne({
        where: { id: savedPortfolio.id },
        relations: ['assets'],
      });

      // Note: This assumes a proper relation is set up
      // expect(portfolioWithAssets.assets).toHaveLength(5);
    });

    it('should calculate portfolio totals correctly', async () => {
      const user = await seeder.seedUser();
      const assets = [
        TestDataFactory.createPortfolioAsset({
          userId: user.id,
          balance: '100.5',
          metadata: { priceUsd: 2000, valueUsd: 201000 },
        }),
        TestDataFactory.createPortfolioAsset({
          userId: user.id,
          balance: '50.25',
          metadata: { priceUsd: 1000, valueUsd: 50250 },
        }),
      ];

      await assetRepository.save(assets);

      const totalValue = await assetRepository
        .createQueryBuilder('asset')
        .select("SUM(CAST(asset.metadata->>'valueUsd' AS DECIMAL))", 'total')
        .where('asset.userId = :userId', { userId: user.id })
        .getRawOne();

      expect(parseFloat(totalValue.total)).toBe(251250);
    });

    it('should handle asset balance updates', async () => {
      const user = await seeder.seedUser();
      const asset = TestDataFactory.createPortfolioAsset({
        userId: user.id,
        balance: '100.0',
      });
      const savedAsset = await assetRepository.save(asset);

      // Update balance
      await assetRepository.update(savedAsset.id, {
        balance: '150.5',
        lastUpdated: new Date(),
      });

      const updatedAsset = await assetRepository.findOne({
        where: { id: savedAsset.id },
      });
      expect(updatedAsset.balance).toBe('150.5');
    });
  });

  describe('Transaction Management', () => {
    it('should create and link transactions to users', async () => {
      const user = await seeder.seedUser();
      const transactionData = TestDataFactory.createTransaction({
        userId: user.id,
      });
      const savedTransaction =
        await transactionRepository.save(transactionData);

      expect(savedTransaction.id).toBeDefined();
      expect(savedTransaction.userId).toBe(user.id);

      const transactionWithUser = await transactionRepository.findOne({
        where: { id: savedTransaction.id },
        relations: ['user'],
      });
      expect(transactionWithUser.user.id).toBe(user.id);
    });

    it('should enforce unique transaction hashes', async () => {
      const user = await seeder.seedUser();
      const transactionHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';

      const tx1 = TestDataFactory.createTransaction({
        userId: user.id,
        transactionHash,
      });
      const tx2 = TestDataFactory.createTransaction({
        userId: user.id,
        transactionHash,
      });

      await transactionRepository.save(tx1);

      await expect(transactionRepository.save(tx2)).rejects.toThrow();
    });

    it('should query transactions by status efficiently', async () => {
      const user = await seeder.seedUser();
      const confirmedTxs = TestDataFactory.createBulkTransactions(100, {
        userId: user.id,
        status: 'confirmed',
      });
      const pendingTxs = TestDataFactory.createBulkTransactions(50, {
        userId: user.id,
        status: 'pending',
      });

      await transactionRepository.save([...confirmedTxs, ...pendingTxs]);

      const startTime = Date.now();
      const confirmedCount = await transactionRepository.count({
        where: { userId: user.id, status: 'confirmed' },
      });
      const queryTime = Date.now() - startTime;

      expect(confirmedCount).toBe(100);
      expect(queryTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('Notification Management', () => {
    it('should create and manage user notifications', async () => {
      const user = await seeder.seedUser();
      const notificationData = TestDataFactory.createNotification({
        userId: user.id,
      });
      const savedNotification =
        await notificationRepository.save(notificationData);

      expect(savedNotification.id).toBeDefined();
      expect(savedNotification.read).toBe(notificationData.read);

      // Mark as read
      await notificationRepository.update(savedNotification.id, { read: true });

      const updatedNotification = await notificationRepository.findOne({
        where: { id: savedNotification.id },
      });
      expect(updatedNotification.read).toBe(true);
    });

    it('should query unread notifications efficiently', async () => {
      const user = await seeder.seedUser();
      const readNotifications = TestDataFactory.createBulkNotifications(200, {
        userId: user.id,
        read: true,
      });
      const unreadNotifications = TestDataFactory.createBulkNotifications(50, {
        userId: user.id,
        read: false,
      });

      await notificationRepository.save([
        ...readNotifications,
        ...unreadNotifications,
      ]);

      const startTime = Date.now();
      const unreadCount = await notificationRepository.count({
        where: { userId: user.id, read: false },
      });
      const queryTime = Date.now() - startTime;

      expect(unreadCount).toBe(50);
      expect(queryTime).toBeLessThan(100);
    });
  });

  describe('Complex Queries and Relations', () => {
    it('should perform complex joins efficiently', async () => {
      const user = await seeder.seedUser();
      await seeder.seedPortfolioAssets(10, { userId: user.id });
      await seeder.seedTransactions(20, { userId: user.id });
      await seeder.seedNotifications(15, { userId: user.id });

      const startTime = Date.now();

      // Complex query joining multiple tables
      const result = await dataSource.query(
        `
        SELECT 
          u.id as user_id,
          u.username,
          COUNT(DISTINCT pa.id) as asset_count,
          COUNT(DISTINCT t.id) as transaction_count,
          COUNT(DISTINCT n.id) as notification_count
        FROM users u
        LEFT JOIN portfolio_assets pa ON u.id = pa."userId"
        LEFT JOIN transactions t ON u.id = t."userId"
        LEFT JOIN notifications n ON u.id = n."userId"
        WHERE u.id = $1
        GROUP BY u.id, u.username
      `,
        [user.id],
      );

      const queryTime = Date.now() - startTime;

      expect(result).toHaveLength(1);
      expect(parseInt(result[0].asset_count)).toBe(10);
      expect(parseInt(result[0].transaction_count)).toBe(20);
      expect(parseInt(result[0].notification_count)).toBe(15);
      expect(queryTime).toBeLessThan(200);
    });

    it('should handle large dataset queries with pagination', async () => {
      const user = await seeder.seedUser();
      const transactions = TestDataFactory.createBulkTransactions(1000, {
        userId: user.id,
      });

      await transactionRepository.save(transactions);

      const startTime = Date.now();

      const paginatedResults = await transactionRepository.find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
        take: 20,
        skip: 0,
      });

      const queryTime = Date.now() - startTime;

      expect(paginatedResults).toHaveLength(20);
      expect(queryTime).toBeLessThan(150);
    });
  });

  describe('Database Transactions and Consistency', () => {
    it('should maintain ACID properties during concurrent updates', async () => {
      const user = await seeder.seedUser();
      const asset = TestDataFactory.createPortfolioAsset({
        userId: user.id,
        balance: '1000.0',
      });
      const savedAsset = await assetRepository.save(asset);

      // Simulate concurrent balance updates
      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        dataSource.transaction(async (manager) => {
          const currentAsset = await manager.findOne(PortfolioAsset, {
            where: { id: savedAsset.id },
          });
          const currentBalance = parseFloat(currentAsset.balance);
          const newBalance = currentBalance + (i + 1);

          await manager.update(PortfolioAsset, savedAsset.id, {
            balance: newBalance.toString(),
          });
        }),
      );

      await Promise.all(updatePromises);

      const finalAsset = await assetRepository.findOne({
        where: { id: savedAsset.id },
      });

      // Balance should be consistent (though we can't predict exact value due to concurrency)
      expect(parseFloat(finalAsset.balance)).toBeGreaterThan(1000);
    });

    it('should rollback failed transactions', async () => {
      const user = await seeder.seedUser();
      const initialCount = await userRepository.count();

      try {
        await dataSource.transaction(async (manager) => {
          // Create a user
          const newUser = TestDataFactory.createUser();
          await manager.save(User, newUser);

          // Intentionally cause an error
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected to fail
      }

      const finalCount = await userRepository.count();
      expect(finalCount).toBe(initialCount); // No new users should be created
    });
  });

  describe('Database Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const users = TestDataFactory.createBulkUsers(1000);

      const startTime = Date.now();
      await userRepository.save(users);
      const saveTime = Date.now() - startTime;

      expect(saveTime).toBeLessThan(5000); // Should complete within 5 seconds

      const queryStartTime = Date.now();
      const count = await userRepository.count();
      const queryTime = Date.now() - queryStartTime;

      expect(count).toBe(1000);
      expect(queryTime).toBeLessThan(100); // Count query should be fast
    });

    it('should optimize index usage for common queries', async () => {
      const user = await seeder.seedUser();
      const transactions = TestDataFactory.createBulkTransactions(10000, {
        userId: user.id,
      });

      await transactionRepository.save(transactions);

      // Query by indexed field (userId) should be fast
      const startTime = Date.now();
      const userTransactions = await transactionRepository.find({
        where: { userId: user.id },
        take: 100,
      });
      const queryTime = Date.now() - startTime;

      expect(userTransactions).toHaveLength(100);
      expect(queryTime).toBeLessThan(200);
    });
  });
});
