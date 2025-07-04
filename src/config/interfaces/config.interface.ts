export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface SessionConfig {
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface CryptoConfig {
  apiKeys: {
    coinMarketCap: string;
    coinGecko: string;
  };
}

export interface StarknetConfig {
  providerUrl: string;
  network: string;
  pollingIntervalMs: number;
}

export interface BackupConfig {
  backupDir: string;
  retentionDays: number;
  encryptionKey: string;
}

export interface AppConfig {
  environment: string;
  port: number;
  database: DatabaseConfig;
  jwt: JwtConfig;
  crypto: CryptoConfig;
  starknet: StarknetConfig;
  backup?: BackupConfig;
  LOG_LEVEL?: string;
}
