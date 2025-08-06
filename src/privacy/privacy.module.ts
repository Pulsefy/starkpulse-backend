import { Module } from '@nestjs/common';

import { PrivacyService } from './privacy.service';
import { GdprComplianceService } from './gdpr-compliance.service';
import { ConsentManagementService } from './consent-management.service';
import { DataRetentionService } from './data-retention.service';
import { PrivacyController } from './privacy.controller';

@Module({
  controllers: [PrivacyController],
  providers: [
    PrivacyService,
    GdprComplianceService,
    ConsentManagementService,
    DataRetentionService,
  ],
  exports: [
    PrivacyService,
    GdprComplianceService,
    ConsentManagementService,
    DataRetentionService,
  ],
})
export class PrivacyModule {}
