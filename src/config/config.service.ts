import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  DatabaseConfig,
  JwtConfig,
  CryptoConfig,
  StarknetConfig,
  AppConfig,
  SessionConfig,
} from './interfaces/config.interface';
import { StarkNetConfig } from './interfaces/starknet-config.interface';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get environment(): string {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    if (!env) {
      throw new Error('Environment is not configured');
    }
    return env;
  }

  get port(): number {
    const port = this.configService.get<number>('PORT', 3000);
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

  get sessionConfig(): SessionConfig {
    const config = this.configService.get<SessionConfig>('session');
    if (!config) {
      throw new Error('Sesion configuration is missing');
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

  get starknetConfig(): StarknetConfig {
    const config = this.configService.get<StarknetConfig>('starknet');
    if (!config) {
      throw new Error('Starknet configuration is missing');
    }
    return config;
  }

  get backupConfig() {
    const config = this.configService.get('backup');
    if (!config) {
      throw new Error('Backup configuration is missing');
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

  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured. Please set this environment variable.',
      );
    }
    return secret;
  }

  get jwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not configured. Please set this environment variable.',
      );
    }
    return secret;
  }

  // Rename this to avoid duplicate
  get starknetNetworkConfig(): StarkNetConfig {
    const network = this.configService.get<'mainnet' | 'testnet' | 'devnet'>(
      'STARKNET_NETWORK',
      'testnet',
    );
    const providerUrl = this.configService.get<string>('STARKNET_PROVIDER_URL');
    const chainId = this.configService.get<string>('STARKNET_CHAIN_ID');

    if (!providerUrl) {
      throw new Error(
        'STARKNET_PROVIDER_URL is not configured. Please set this environment variable.',
      );
    }

    if (!chainId) {
      throw new Error(
        'STARKNET_CHAIN_ID is not configured. Please set this environment variable.',
      );
    }

    return {
      network,
      providerUrl,
      chainId,
    };
  }

  get starknetNetwork(): string {
    return this.starknetConfig.network;
  }
}
