import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import * as path from 'path';

export class TestEnvironment {
  private static pgContainer: StartedPostgreSqlContainer;
  private static redisContainer: StartedRedisContainer;
  private static app: INestApplication;
  private static moduleRef: TestingModule;

  static async setupTestContainers(): Promise<void> {
    // Start PostgreSQL container
    if (!this.pgContainer) {
      this.pgContainer = await new PostgreSqlContainer()
        .withDatabase('test_db')
        .withUsername('test_user')
        .withPassword('test_password')
        .withExposedPorts(5432)
        .start();
    }

    // Start Redis container
    if (!this.redisContainer) {
      this.redisContainer = await new RedisContainer()
        .withExposedPorts(6379)
        .start();
    }

    // Set environment variables for tests
    process.env.DATABASE_HOST = this.pgContainer.getHost();
    process.env.DATABASE_PORT = this.pgContainer.getPort().toString();
    process.env.DATABASE_NAME = 'test_db';
    process.env.DATABASE_USERNAME = 'test_user';
    process.env.DATABASE_PASSWORD = 'test_password';
    process.env.REDIS_HOST = this.redisContainer.getHost();
    process.env.REDIS_PORT = this.redisContainer.getPort().toString();
  }

  static async createTestModule(
    imports: any[] = [],
    providers: any[] = [],
    controllers: any[] = [],
  ): Promise<TestingModule> {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DATABASE_HOST,
          port: parseInt(process.env.DATABASE_PORT || '5432'),
          username: process.env.DATABASE_USERNAME,
          password: process.env.DATABASE_PASSWORD,
          database: process.env.DATABASE_NAME,
          entities: [path.join(__dirname, '../../src/**/*.entity{.ts,.js}')],
          synchronize: true,
          dropSchema: true,
        }),
        CacheModule.register({
          store: 'memory',
          ttl: 5,
        }),
        ...imports,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                database: {
                  host: process.env.DATABASE_HOST,
                  port: parseInt(process.env.DATABASE_PORT || '5432'),
                  username: process.env.DATABASE_USERNAME,
                  password: process.env.DATABASE_PASSWORD,
                  database: process.env.DATABASE_NAME,
                },
                redis: {
                  host: process.env.REDIS_HOST,
                  port: parseInt(process.env.REDIS_PORT || '6379'),
                },
                jwt: {
                  secret: 'test-secret',
                  expiresIn: '1h',
                },
                starknet: {
                  providerUrl: 'https://alpha-mainnet.starknet.io',
                  network: 'mainnet',
                  pollingIntervalMs: 10000,
                },
              };
              return config[key] || process.env[key.toUpperCase()];
            }),
          },
        },
        ...providers,
      ],
      controllers,
    });

    this.moduleRef = await moduleBuilder.compile();
    return this.moduleRef;
  }

  static async createTestApp(
    module?: TestingModule,
  ): Promise<INestApplication> {
    if (!module) {
      module = this.moduleRef;
    }

    this.app = module.createNestApplication();

    // Apply same middleware as main app
    this.app.setGlobalPrefix('api/v1');

    await this.app.init();
    return this.app;
  }

  static async cleanupTestContainers(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }

    if (this.moduleRef) {
      await this.moduleRef.close();
    }

    if (this.pgContainer) {
      await this.pgContainer.stop();
    }

    if (this.redisContainer) {
      await this.redisContainer.stop();
    }
  }

  static getRepository<T extends ObjectLiteral>(entity: any): Repository<T> {
    return this.moduleRef.get(getRepositoryToken(entity));
  }

  static getDatabaseConfig() {
    return {
      host: this.pgContainer?.getHost(),
      port: this.pgContainer?.getPort(),
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
    };
  }

  static getRedisConfig() {
    return {
      host: this.redisContainer?.getHost(),
      port: this.redisContainer?.getPort(),
    };
  }
}
