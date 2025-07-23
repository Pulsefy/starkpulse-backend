import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SecretsService } from './secrets.service';
import { Role } from '../auth/roles/role.enum';
import { randomBytes } from 'crypto';

@Injectable()
export class SecretsRotationService {
  private readonly logger = new Logger(SecretsRotationService.name);

  constructor(private secretsService: SecretsService) {}

  // This cron job runs once a day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRotateApiKeys() {
    this.logger.log('Starting scheduled rotation for API keys...');

    // Generate a new API key
    const newApiKey = randomBytes(32).toString('hex');

    const secretPath = 'api/keys';
    const data = { external_service_api_key: newApiKey };

    try {
      // The rotation service acts as an 'admin' to write the new secret
      await this.secretsService.setSecret(secretPath, data, [Role.Admin]);
      this.logger.log(`Successfully rotated secret at path: ${secretPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to rotate secret at path: ${secretPath}`,
        error.stack,
      );
    }
  }
}
