import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { VaultIntegrationService } from './vault-integration.service';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  constructor(private readonly vaultService: VaultIntegrationService) {}

  private checkAccess(userId: string, requiredRole: string): boolean {
    const userRoles = { 'user-123': ['admin'] };
    const hasPermission = userRoles[userId]?.includes(requiredRole);
    if (!hasPermission) {
      this.logger.warn(
        `Unauthorized access attempt for secret by user: ${userId}`,
      );
    }
    return hasPermission;
  }

  async getSecret(
    userId: string,
    path: string,
    requiredRole: string,
  ): Promise<any> {
    this.logger.log(
      `Audit: User ${userId} attempting to access secret at ${path}`,
    );
    if (!this.checkAccess(userId, requiredRole)) {
      throw new UnauthorizedException('Access denied to this secret.');
    }

    const secret = await this.vaultService.readSecret(path);

    this.logger.log(
      `Audit: User ${userId} successfully accessed secret at ${path}`,
    );

    return secret;
  }
}
