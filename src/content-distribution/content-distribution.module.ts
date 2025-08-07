import { Module } from '@nestjs/common';
import { ContentDistributionService } from './content-distribution.service';
import { ContentStorageModule } from '../content-storage/content-storage.module';

@Module({
  imports: [ContentStorageModule],
  providers: [ContentDistributionService],
  exports: [ContentDistributionService],
})
export class ContentDistributionModule {}
