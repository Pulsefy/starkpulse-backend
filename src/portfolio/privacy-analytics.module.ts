import { Module } from '@nestjs/common';
import { PrivacyAnalyticsService } from './privacy-analytics.service';
import { ZKModule } from '../zk/zk.module';

@Module({
  imports: [ZKModule],
  providers: [PrivacyAnalyticsService],
  exports: [PrivacyAnalyticsService],
})
export class PrivacyAnalyticsModule {}
