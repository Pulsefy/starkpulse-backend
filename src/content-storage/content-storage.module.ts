import { Module } from '@nestjs/common';
import { ContentStorageService } from './content-storage.service';

@Module({
  providers: [ContentStorageService],
  exports: [ContentStorageService],
})
export class ContentStorageModule {}
