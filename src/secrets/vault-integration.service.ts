import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class VaultIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(VaultIntegrationService.name);
  private vaultClient: AxiosInstance;

  private readonly vaultApiUrl = 'http://127.0.0.1:8200/v1/secret';
  private readonly vaultToken = 'my-vault-root-token';

  async onModuleInit() {
    this.vaultClient = axios.create({
      baseURL: this.vaultApiUrl,
      headers: { 'X-Vault-Token': this.vaultToken },
    });

    try {
      await this.vaultClient.get('/health');
      this.logger.log('Successfully connected to HashiCorp Vault.');
    } catch (error) {
      this.logger.error('Failed to connect to HashiCorp Vault.', error.message);
    }
  }

  async readSecret(path: string): Promise<any> {
    this.logger.log(`Attempting to read secret at path: ${path}`);
    try {
      const response = await this.vaultClient.get(`/data/${path}`);
      this.logger.log(`Successfully read secret from: ${path}`);
      return response.data.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to read secret from path: ${path}`,
        error.message,
      );
      throw new Error(`Failed to read secret: ${error.message}`);
    }
  }

  async writeSecret(path: string, data: any): Promise<void> {
    this.logger.log(`Attempting to write secret to path: ${path}`);
    try {
      await this.vaultClient.post(`/data/${path}`, { data });
      this.logger.log(`Successfully wrote secret to: ${path}`);
    } catch (error) {
      this.logger.error(
        `Failed to write secret to path: ${path}`,
        error.message,
      );
      throw new Error(`Failed to write secret: ${error.message}`);
    }
  }

  async deleteSecret(path: string): Promise<void> {
    this.logger.log(`Attempting to delete secret at path: ${path}`);
    try {
      await this.vaultClient.delete(`/data/${path}`);
      this.logger.log(`Successfully deleted secret from: ${path}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete secret from path: ${path}`,
        error.message,
      );
      throw new Error(`Failed to delete secret: ${error.message}`);
    }
  }
}
