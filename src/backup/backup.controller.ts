import { Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('database')
  @HttpCode(HttpStatus.ACCEPTED)
  async backupDatabase() {
    const file = await this.backupService.backupDatabase();
    return { message: 'Database backup started', file };
  }

  @Post('config')
  @HttpCode(HttpStatus.ACCEPTED)
  async backupConfig() {
    const file = await this.backupService.backupConfig();
    return { message: 'Config backup started', file };
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupOldBackups() {
    await this.backupService.cleanupOldBackups();
    return { message: 'Old backups cleaned up' };
  }

  @Get('status')
  async status() {
    // For now, just list backup files
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.resolve(__dirname, '../../backups');
    const files = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
    return { backups: files };
  }
}
