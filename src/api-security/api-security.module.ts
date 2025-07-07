import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ApiSecurityController } from './api-security.controller';
import { ApiSigningGuard } from './guards/api-signing.guard';
import { ApiAbuseDetectionService } from './services/api-abuse-detection.service';
import { RequestEncryptionService } from './services/request-encryption.service';
import { ApiSecurityMiddleware } from './middleware/api-security.middleware';
import { ApiVersioningGuard } from './guards/api-versioning.guard';
import { RateLimitGuard } from './guards/rate-limit-guard';

@Module({
  providers: [
    ApiSigningGuard,
    RateLimitGuard,
    ApiAbuseDetectionService,
    RequestEncryptionService,
    ApiVersioningGuard,
  ],
  controllers: [ApiSecurityController],
  exports: [
    ApiSigningGuard,
    RateLimitGuard,
    ApiAbuseDetectionService,
    RequestEncryptionService,
    ApiVersioningGuard,
  ],
})
export class ApiSecurityModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiSecurityMiddleware).forRoutes({
      path: 'api-security/encrypted-data',
      method: RequestMethod.ALL,
    });
  }
}
