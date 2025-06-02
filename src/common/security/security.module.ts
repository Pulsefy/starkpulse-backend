import { Module } from '@nestjs/common';
import { CsrfTokenService } from './csrf-token.service';
import { SecurityController } from './security.controller';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { CsrfMiddleware } from '../middleware/csrf.middleware';
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';

@Module({
  controllers: [SecurityController],
  providers: [CsrfTokenService, RateLimitGuard, CsrfMiddleware, SecurityHeadersMiddleware],
  exports: [CsrfTokenService, RateLimitGuard, CsrfMiddleware, SecurityHeadersMiddleware],
})
export class SecurityModule {}
