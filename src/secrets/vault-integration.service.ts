import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as vault from 'node-vault';

@Injectable()
export class VaultIntegrationService implements OnModuleInit {
  private vaultClient: vault.client;
  private readonly logger = new Logger(VaultIntegrationService.name);

  onModuleInit() {
    const options = {
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
      token: process.env.VAULT_TOKEN,
    };

    if (!options.token) {
      this.logger.error('VAULT_TOKEN is not set. Vault integration will fail.');
      throw new Error('Vault token is missing.');
    }

    this.vaultClient = vault(options);
    this.logger.log('Vault client initialized.');
  }

  async readSecret(path: string): Promise<any> {
    try {
      const response = await this.vaultClient.read(`secret/data/${path}`);
      return response.data.data; // The actual secrets are nested here
    } catch (error) {
      this.logger.error(
        `Failed to read secret from Vault at path: ${path}`,
        error.stack,
      );
      throw new Error('Could not retrieve secret from Vault.');
    }
  }

  async writeSecret(path: string, data: Record<string, any>): Promise<void> {
    try {
      await this.vaultClient.write(`secret/data/${path}`, { data });
    } catch (error) {
      this.logger.error(
        `Failed to write secret to Vault at path: ${path}`,
        error.stack,
      );
      throw new Error('Could not write secret to Vault.');
    }
  }
}
