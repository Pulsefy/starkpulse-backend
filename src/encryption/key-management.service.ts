import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

@Injectable()
export class KeyManagementService implements OnModuleInit {
  private readonly logger = new Logger(KeyManagementService.name);
  private currentEncryptionKey: Buffer;
  private currentIv: Buffer;
  private keyRotationIntervalMs = 24 * 60 * 60 * 1000;
  private keyRotationTimer: NodeJS.Timeout;

  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;

  onModuleInit() {
    this.logger.log(
      'KeyManagementService initialized. Generating initial key...',
    );
    this.generateNewKey();
    this.scheduleKeyRotation();
  }

  private generateNewKey(): void {
    this.currentEncryptionKey = randomBytes(this.KEY_LENGTH);
    this.currentIv = randomBytes(this.IV_LENGTH);
    this.logger.log('New encryption key and IV generated.');
  }

  getCurrentKey(): Buffer {
    return this.currentEncryptionKey;
  }

  getCurrentIv(): Buffer {
    return this.currentIv;
  }

  getAlgorithm(): string {
    return this.ALGORITHM;
  }

  scheduleKeyRotation(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
    }
    this.keyRotationTimer = setInterval(() => {
      this.logger.log('Initiating automatic key rotation...');
      this.generateNewKey();
    }, this.keyRotationIntervalMs);
    this.logger.log(
      `Key rotation scheduled for every ${this.keyRotationIntervalMs / (1000 * 60 * 60)} hours.`,
    );
  }

  rotateKeyManually(isAdmin: boolean): { success: boolean; message?: string } {
    if (!isAdmin) {
      this.logger.warn('Unauthorized attempt to manually rotate key.');
      return {
        success: false,
        message: 'Unauthorized: Admin access required.',
      };
    }
    this.logger.log('Initiating manual key rotation...');
    this.generateNewKey();
    return { success: true, message: 'Key rotated successfully.' };
  }
}
