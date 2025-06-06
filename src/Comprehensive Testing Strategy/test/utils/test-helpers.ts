import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { User } from '../../src/user/entities/user.entity';
import { CreateUserDto } from '../../src/user/dto/user.dto';

export class TestHelpers {
  static createMockUser(overrides: Partial<User> = {}): User {
    return {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    };
  }

  static createMockCreateUserDto(overrides: Partial<CreateUserDto> = {}): CreateUserDto {
    return {
      name: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      ...overrides,
    };
  }

  static async createTestApp(imports: any[]): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports,
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    return app;
  }

  static generateRandomEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `test-${timestamp}-${random}@example.com`;
  }

  static generateRandomUser(): CreateUserDto {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    
    return {
      name: `Test User ${random}`,
      email: this.generateRandomEmail(),
      phone: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    };
  }

  static async waitForCondition(
    condition: () => Promise<boolean> | boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}
