import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { File as MulterFile } from 'multer';

@Injectable()
export class SecureUploadService {
  private readonly logger = new Logger(SecureUploadService.name);
  private readonly allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.txt'];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  validateFile(file: MulterFile): void {
    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      this.logger.warn(`Rejected file with disallowed extension: ${file.originalname}`);
      throw new BadRequestException('File type not allowed');
    }
    if (file.size > this.maxFileSize) {
      this.logger.warn(`Rejected file exceeding size limit: ${file.originalname}`);
      throw new BadRequestException('File size exceeds limit');
    }
    if (/[^a-zA-Z0-9._-]/.test(file.originalname)) {
      this.logger.warn(`Rejected file with suspicious name: ${file.originalname}`);
      throw new BadRequestException('Invalid file name');
    }
  }

  sanitizeFileName(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  handleUpload(file: MulterFile): string {
    this.validateFile(file);
    const safeName = this.sanitizeFileName(file.originalname);
    // Save file logic here (e.g., to disk, cloud, etc.)
    this.logger.log(`File uploaded securely: ${safeName}`);
    return safeName;
  }
} 