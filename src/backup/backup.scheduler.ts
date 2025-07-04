import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BackupService } from './backup.service';

@Injectable()
export class BackupScheduler {
  private readonly logger = new Logger(BackupScheduler.name);

  constructor(private readonly backupService: BackupService) {}

  // Daily at 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDatabaseBackup() {
    this.logger.log('Scheduled database backup started');
    try {
      await this.backupService.backupDatabase();
      this.logger.log('Scheduled database backup completed');
    } catch (err) {
      this.logger.error('Scheduled database backup failed', err);
    }
  }

  // Daily at 2:30 AM
  @Cron('30 2 * * *')
  async handleConfigBackup() {
    this.logger.log('Scheduled config backup started');
    try {
      await this.backupService.backupConfig();
      this.logger.log('Scheduled config backup completed');
    } catch (err) {
      this.logger.error('Scheduled config backup failed', err);
    }
  }

  // Daily at 3:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    this.logger.log('Scheduled backup cleanup started');
    try {
      await this.backupService.cleanupOldBackups();
      this.logger.log('Scheduled backup cleanup completed');
    } catch (err) {
      this.logger.error('Scheduled backup cleanup failed', err);
    }
  }
}
