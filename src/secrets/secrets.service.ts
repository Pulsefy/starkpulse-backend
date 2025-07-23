import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { VaultIntegrationService } from './vault-integration.service';
import { Role } from '../auth/roles/role.enum';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  constructor(private vaultService: VaultIntegrationService) {}

  async getSecret(secretPath: string, userRoles: Role[]): Promise<any> {
    if (!this.hasPermission(secretPath, userRoles)) {
      this.logger.warn(
        `User with roles [${userRoles}] denied access to secret: ${secretPath}`,
      );
      throw new UnauthorizedException(
        'Insufficient permissions to access this secret.',
      );
    }

    this.logger.log(`Fetching secret at path: ${secretPath}`);
    // Audit Logging
    this.logAuditEvent('read', secretPath, userRoles);

    return this.vaultService.readSecret(secretPath);
  }

  async setSecret(
    secretPath: string,
    data: Record<string, any>,
    userRoles: Role[],
  ): Promise<void> {
    // Write operations are highly sensitive, restricted to Admins
    if (!userRoles.includes(Role.Admin)) {
      this.logger.warn(
        `Non-admin user denied write access to secret: ${secretPath}`,
      );
      throw new UnauthorizedException('Only admins can write secrets.');
    }

    this.logger.log(`Writing secret to path: ${secretPath}`);
    // Audit Logging
    this.logAuditEvent('write', secretPath, userRoles);

    await this.vaultService.writeSecret(secretPath, data);
  }

  private hasPermission(secretPath: string, roles: Role[]): boolean {
    if (roles.includes(Role.Admin)) {
      return true;
    }
    if (secretPath.startsWith('database/') && roles.includes(Role.User)) {
      return true;
    }
    return false;
  }

  private logAuditEvent(
    action: 'read' | 'write',
    secretPath: string,
    roles: Role[],
  ) {
    this.logger.log(
      `AUDIT - Action: ${action}, Path: ${secretPath}, Roles: [${roles.join(', ')}], Timestamp: ${new Date().toISOString()}`,
    );
  }
}
