import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

@Injectable()
export class RequestEncryptionService {
  private readonly logger = new Logger(RequestEncryptionService.name);
  private readonly ENCRYPTION_SECRET = scryptSync(
    'a-very-secure-shared-secret-for-api-encryption',
    'salt',
    32,
  );
  private readonly ALGORITHM = 'aes-256-cbc';
  private readonly IV_LENGTH = 16;

  encrypt(text: string): string {
    try {
      const iv = randomBytes(this.IV_LENGTH);
      const cipher = createCipheriv(this.ALGORITHM, this.ENCRYPTION_SECRET, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error('Encryption failed.');
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format.');
      }
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = createDecipheriv(
        this.ALGORITHM,
        this.ENCRYPTION_SECRET,
        iv,
      );
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      throw new Error('Decryption failed.');
    }
  }
}
