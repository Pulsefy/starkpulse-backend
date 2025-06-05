import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrustedUserConfig } from '../interfaces/rate-limit.interface';

@Injectable()
export class TrustedUserService {
  private readonly logger = new Logger(TrustedUserService.name);
  private trustedConfig: TrustedUserConfig;

  constructor(private readonly configService: ConfigService) {
    this.trustedConfig = this.configService.get<TrustedUserConfig>('rateLimit.trusted');
  }

  async isTrustedUser(
    userId?: number,
    userRoles?: string[],
    ipAddress?: string,
  ): Promise<boolean> {
    if (!this.trustedConfig) return false;

    if (userId && this.trustedConfig.userIds.includes(userId)) {
      this.logger.debug(`User ${userId} is in trusted users list`);
      return true;
    }

    if (userRoles && userRoles.some(role => this.trustedConfig.roles.includes(role))) {
      this.logger.debug(`User ${userId} has trusted role: ${userRoles.join(', ')}`);
      return true;
    }

    if (ipAddress && this.trustedConfig.ipAddresses.includes(ipAddress)) {
      this.logger.debug(`IP ${ipAddress} is in trusted IPs list`);
      return true;
    }

    return false;
  }

  async addTrustedUser(userId: number): Promise<void> {
    if (!this.trustedConfig.userIds.includes(userId)) {
      this.trustedConfig.userIds.push(userId);
      this.logger.log(`Added user ${userId} to trusted users list`);
    }
  }

  async removeTrustedUser(userId: number): Promise<void> {
    const index = this.trustedConfig.userIds.indexOf(userId);
    if (index > -1) {
      this.trustedConfig.userIds.splice(index, 1);
      this.logger.log(`Removed user ${userId} from trusted users list`);
    }
  }

  async addTrustedIp(ipAddress: string): Promise<void> {
    if (!this.trustedConfig.ipAddresses.includes(ipAddress)) {
      this.trustedConfig.ipAddresses.push(ipAddress);
      this.logger.log(`Added IP ${ipAddress} to trusted IPs list`);
    }
  }

  async removeTrustedIp(ipAddress: string): Promise<void> {
    const index = this.trustedConfig.ipAddresses.indexOf(ipAddress);
    if (index > -1) {
      this.trustedConfig.ipAddresses.splice(index, 1);
      this.logger.log(`Removed IP ${ipAddress} from trusted IPs list`);
    }
  }

  getTrustedConfig(): TrustedUserConfig {
    return { ...this.trustedConfig };
  }
}