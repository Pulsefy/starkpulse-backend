import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { GdprComplianceService } from './gdpr-compliance.service';
import { ConsentManagementService } from './consent-management.service';
import { DataRetentionService } from './data-retention.service';
import { DataSubjectRequestDto } from './dto/data-subject-request.dto';

@Controller('privacy')
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly gdprService: GdprComplianceService,
    private readonly consentService: ConsentManagementService,
    private readonly retentionService: DataRetentionService,
  ) {}

  @Post('data-subject-request')
  handleDataSubjectRequest(@Body() dto: DataSubjectRequestDto) {
    // Route to appropriate GDPR handler
    switch (dto.type) {
      case 'access':
        return this.gdprService.handleDataSubjectAccessRequest(dto.userId);
      case 'erasure':
        return this.gdprService.handleDataErasureRequest(dto.userId);
      case 'portability':
        return this.gdprService.handleDataPortabilityRequest(dto.userId);
      default:
        return { message: 'Request type not implemented.' };
    }
  }

  @Post('consent')
  giveConsent(@Body() body: { userId: string; consentType: string }) {
    return this.consentService.giveConsent(body.userId, body.consentType);
  }

  @Post('consent/revoke')
  revokeConsent(@Body() body: { userId: string; consentType: string }) {
    return this.consentService.revokeConsent(body.userId, body.consentType);
  }

  @Get('consent/:userId/:consentType')
  checkConsent(@Param('userId') userId: string, @Param('consentType') consentType: string) {
    return this.consentService.checkConsent(userId, consentType);
  }

  @Post('retention/enforce')
  enforceRetention(@Body() body: { userId: string }) {
    return this.retentionService.enforceRetentionPolicy(body.userId);
  }

  @Post('retention/schedule-deletion')
  scheduleDeletion(@Body() body: { userId: string; date: string }) {
    return this.retentionService.scheduleDataDeletion(body.userId, new Date(body.date));
  }

  @Get('privacy-impact-assessment')
  performPrivacyImpactAssessment() {
    return this.privacyService.performPrivacyImpactAssessment();
  }

  @Get('privacy-audit')
  auditPrivacyControls() {
    return this.privacyService.auditPrivacyControls();
  }
}
