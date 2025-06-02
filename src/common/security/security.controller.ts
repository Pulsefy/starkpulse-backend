import { Controller } from '@nestjs/common';
import { CsrfTokenService } from './csrf-token.service';
import { Logger } from '@nestjs/common';

/**
 * Controller for security-related endpoints
 */
@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(private csrfTokenService: CsrfTokenService) {}
}
