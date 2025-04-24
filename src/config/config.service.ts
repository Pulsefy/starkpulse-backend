import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { DatabaseConfig, JwtConfig, CryptoConfig, AppConfig } from './interfaces/config.interface';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get environment(): string {
    const env = this.configService.get<string>('environment');
    if (!env) {
      throw new Error('Environment is not configured');
    }
    return env;
  }

  get port(): number {
    const port = this.configService.get<number>('port');
    if (port === undefined) {
      throw new Error('Port is not configured');
    }
    return port;
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  get isTest(): boolean {
    return this.environment === 'test';
  }

  get databaseConfig(): DatabaseConfig {
    const config = this.configService.get<DatabaseConfig>('database');
    if (!config) {
      throw new Error('Database configuration is missing');
    }
    return config;
  }

  get jwtConfig(): JwtConfig {
    const config = this.configService.get<JwtConfig>('jwt');
    if (!config) {
      throw new Error('JWT configuration is missing');
    }
    return config;
  }

  get cryptoConfig(): CryptoConfig {
    const config = this.configService.get<CryptoConfig>('crypto');
    if (!config) {
      throw new Error('Crypto configuration is missing');
    }
    return config;
  }

  get<T>(key: keyof AppConfig): T {
    const value = this.configService.get<T>(key);
    if (value === undefined) {
      throw new Error(`${key} is not configured`);
    }
    return value;
  }
}
