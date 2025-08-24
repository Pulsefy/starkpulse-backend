import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrivacyService } from '../services/privacy.service';
import { GdprComplianceService } from '../gdpr-compliance.service';
import { ConsentManagementService } from '../consent-management.service';
import { DataRetentionService } from '../data-retention.service';
import { User } from 'src/auth/entities/user.entity';
import { GetUser } from 'src/auth/decorator/get-user.decorator';

@ApiTags('Privacy')
@Controller('privacy')
@UseGuards(AuthGuard())
export class PrivacyController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly gdprService: GdprComplianceService,
    private readonly consentService: ConsentManagementService,
    private readonly retentionService: DataRetentionService,
  ) {}

  @Post('request/access')
  @ApiOperation({ summary: 'Request access to personal data' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Request created' })
  async requestDataAccess(@GetUser() user: User) {
    return this.privacyService.createDataAccessRequest(user);
  }

  @Post('request/deletion')
  @ApiOperation({ summary: 'Request data deletion' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Request created' })
  async requestDataDeletion(@GetUser() user: User) {
    return this.privacyService.createDataDeletionRequest(user);
  }

  @Post('request/rectification')
  @ApiOperation({ summary: 'Request data rectification' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Request created' })
  async requestDataRectification(
    @GetUser() user: User,
    @Body() data: Record<string, any>,
  ) {
    return this.privacyService.createDataRectificationRequest(user, data);
  }

  @Get('request/:id/status')
  @ApiOperation({ summary: 'Get privacy request status' })
  async getRequestStatus(@Param('id') requestId: string) {
    return this.privacyService.getRequestStatus(requestId);
  }

  @Get('data/export')
  @ApiOperation({ summary: 'Export user data' })
  async exportData(@GetUser() user: User) {
    return this.gdprService.handleDataSubjectAccessRequest(user.id);
  }

  @Post('consent/:purpose')
  @ApiOperation({ summary: 'Give consent for a specific purpose' })
  @HttpCode(HttpStatus.CREATED)
  async giveConsent(
    @GetUser() user: User,
    @Param('purpose') purpose: string,
  ) {
    return this.consentService.giveConsent(user.id, purpose);
  }

  @Delete('consent/:id')
  @ApiOperation({ summary: 'Revoke a specific consent' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeConsent(@GetUser() user: User, @Param('id') consentId: string) {
    await this.consentService.revokeConsent(user.id, consentId);
  }

  @Get('consents')
  @ApiOperation({ summary: 'Get all user consents' })
  async getUserConsents(@GetUser() user: User) {
    return this.consentService.getUserConsents(user.id);
  }

  @Get('retention-policies')
  @ApiOperation({ summary: 'Get data retention policies' })
  async getRetentionPolicies() {
    // Return all active retention policies
    return [];
  }
}
