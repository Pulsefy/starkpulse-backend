import { TestDataFactory } from './test-data-factory';
import { TestEnvironment } from '../utils/test-environment';
import { User } from '../../src/users/entities/user.entity';
import { PortfolioAsset } from '../../src/portfolio/entities/portfolio-asset.entity';

export class DatabaseSeeder {
  static async seedDatabase() {
    console.log('🌱 Seeding test database...');

    try {
      // Create test users
      const users = await this.seedUsers();
      console.log(`✅ Created ${users.length} test users`);

      // Create portfolio data
      await this.seedPortfolioData(users);
      console.log('✅ Created portfolio data for users');

      console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }

  private static async seedUsers(count: number = 10): Promise<User[]> {
    const userRepo = TestEnvironment.getRepository(User);
    const users = TestDataFactory.createBulkUsers(count);

    // Create some specific test users
    users[0] = TestDataFactory.createUser({
      username: 'testuser',
      walletAddress: '0x1234567890123456789012345678901234567890',
    });

    users[1] = TestDataFactory.createUser({
      username: 'admin',
      walletAddress: '0x0987654321098765432109876543210987654321',
    });

    return await userRepo.save(users);
  }

  private static async seedPortfolioData(users: User[]): Promise<void> {
    const assetRepo = TestEnvironment.getRepository(PortfolioAsset);

    for (const user of users.slice(0, 5)) {
      // Add portfolio data for first 5 users
      const { assets } = TestDataFactory.createRealisticPortfolio(user.id);
      await assetRepo.save(assets);
    }
  }

  static async clearDatabase(): Promise<void> {
    console.log('🧹 Clearing test database...');

    const entities = [PortfolioAsset, User];

    for (const entity of entities) {
      try {
        const repo = TestEnvironment.getRepository(entity);
        await repo.clear();
      } catch (error) {
        console.warn(`Warning: Could not clear ${entity.name}:`, error.message);
      }
    }

    console.log('✅ Database cleared successfully!');
  }
}
