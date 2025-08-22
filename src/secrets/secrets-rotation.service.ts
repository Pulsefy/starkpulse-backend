import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VaultIntegrationService } from './vault-integration.service';
import * as crypto from 'crypto';

@Injectable()
export class SecretsRotationService {
  private readonly logger = new Logger(SecretsRotationService.name);

  constructor(private readonly vaultService: VaultIntegrationService) {}

  @Cron('0 */12 * * *')
  async handleCron() {
    this.logger.log('Starting scheduled secrets rotation.');
    const secretPath = 'api-keys/external-service';

    try {
      // Generate a new, secure secret
      const newApiKey = crypto.randomBytes(32).toString('hex');

      // Store the new secret in Vault
      await this.vaultService.writeSecret(secretPath, { apiKey: newApiKey });

      this.logger.log(`Successfully rotated secret at path: ${secretPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to rotate secret at path: ${secretPath}`,
        error.message,
      );
    }
  }
}
