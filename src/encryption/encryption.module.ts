import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { EncryptionController } from './encryption.controller';
import { KeyManagementService } from './key-management.service';

@Module({
  providers: [EncryptionService, KeyManagementService],
  controllers: [EncryptionController],
  exports: [EncryptionService, KeyManagementService],
})
export class EncryptionModule {}
