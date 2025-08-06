import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.resolve(__dirname, '../../backups');
  private readonly retentionDays = 7; // Default retention policy
  private readonly encryptionKey =
    process.env.BACKUP_ENCRYPTION_KEY || 'default_key_32byteslong!'; // Should be 32 bytes for AES-256

  constructor() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async backupDatabase(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `db-backup-${timestamp}.sql`);
    const compressedFile = `${backupFile}.gz`;
    const encryptedFile = `${compressedFile}.enc`;

    // 1. Dump PostgreSQL database
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');
    await execAsync(`pg_dump ${dbUrl} > ${backupFile}`);

    // 2. Compress
    await this.compressFile(backupFile, compressedFile);
    fs.unlinkSync(backupFile);

    // 3. Encrypt
    await this.encryptFile(compressedFile, encryptedFile);
    fs.unlinkSync(compressedFile);

    // 4. Verify
    await this.verifyBackup(encryptedFile);

    this.logger.log(`Database backup created: ${encryptedFile}`);
    return encryptedFile;
  }

  async backupConfig(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configFile = path.resolve(__dirname, '../../src/config/configuration.ts');
    const backupFile = path.join(this.backupDir, `config-backup-${timestamp}.ts`);
    const compressedFile = `${backupFile}.gz`;
    const encryptedFile = `${compressedFile}.enc`;

    fs.copyFileSync(configFile, backupFile);
    await this.compressFile(backupFile, compressedFile);
    fs.unlinkSync(backupFile);
    await this.encryptFile(compressedFile, encryptedFile);
    fs.unlinkSync(compressedFile);
    await this.verifyBackup(encryptedFile);
    this.logger.log(`Config backup created: ${encryptedFile}`);
    return encryptedFile;
  }

  private async compressFile(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const inp = fs.createReadStream(input);
      const out = fs.createWriteStream(output);
      const gzip = zlib.createGzip();
      inp.pipe(gzip).pipe(out).on('finish', resolve).on('error', reject);
    });
  }

  private async encryptFile(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey),
        Buffer.alloc(16, 0),
      );
      const inp = fs.createReadStream(input);
      const out = fs.createWriteStream(output);
      inp.pipe(cipher).pipe(out).on('finish', resolve).on('error', reject);
    });
  }

  private async verifyBackup(file: string): Promise<void> {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey),
        Buffer.alloc(16, 0),
      );
      const inp = fs.createReadStream(file);
      const tempDecrypted = file.replace('.enc', '.tmp');
      const out = fs.createWriteStream(tempDecrypted);
      await new Promise<void>((resolve, reject) => {
        inp.pipe(decipher).pipe(out).on('finish', resolve).on('error', reject);
      });

      const gunzip = zlib.createGunzip();
      const inp2 = fs.createReadStream(tempDecrypted);
      const out2 = fs.createWriteStream(tempDecrypted + '.out');
      await new Promise<void>((resolve, reject) => {
        inp2.pipe(gunzip).pipe(out2).on('finish', resolve).on('error', reject);
      });

      fs.unlinkSync(tempDecrypted);
      fs.unlinkSync(tempDecrypted + '.out');
    } catch (err) {
      this.logger.error('Backup verification failed', err);
      throw new Error('Backup verification failed');
    }
  }

  async cleanupOldBackups(): Promise<void> {
    const files = fs.readdirSync(this.backupDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stat = fs.statSync(filePath);
      const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > this.retentionDays) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted old backup: ${filePath}`);
      }
    }
  }
}
