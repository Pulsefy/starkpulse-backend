import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SecretsService } from './secrets.service';
import { VaultIntegrationService } from './vault-integration.service';
import { SecretsRotationService } from './secrets-rotation.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [VaultIntegrationService, SecretsRotationService, SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
