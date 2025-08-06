import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../../config/config.service';
import { Logger } from '@nestjs/common';
import { CsrfTokenService } from '../security/csrf-token.service';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly CSRF_HEADER = 'x-csrf-token';
  private readonly CSRF_COOKIE = 'csrf-token';
  private readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

  constructor(
    private configService: ConfigService,
    private csrfTokenService: CsrfTokenService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Special endpoint to generate CSRF token
    if (req.method === 'GET' && req.path === '/security/csrf-token') {
      try {
        const token = this.csrfTokenService.generateToken();
        
        // Set the token as an HTTP-only cookie
        res.cookie(this.CSRF_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        
        // Return the token in the response body so the frontend can use it
        return res.json({ token });
      } catch (error) {
        this.logger.error(`Error generating CSRF token: ${error.message}`);
        return res.status(500).json({
          message: 'Failed to generate security token'
        });
      }
    }

    // Skip CSRF check for safe methods
    if (this.SAFE_METHODS.includes(req.method)) {
      return next();
    }

    // Skip CSRF check for whitelisted paths (e.g., webhook endpoints)
    const whitelistedPaths = [
      '/api/auth/wallet/nonce', // Wallet nonce generation doesn't need CSRF protection
      '/api/auth/wallet/verify', // Wallet verification uses signatures for auth
      '/api/blockchain/events/webhook', // Webhooks from external services
    ];

    if (whitelistedPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    const csrfToken = req.headers[this.CSRF_HEADER] as string;
    const csrfCookie = req.cookies?.[this.CSRF_COOKIE];

    // Validate CSRF token using constant-time comparison to prevent timing attacks
    if (
      !csrfToken ||
      !csrfCookie ||
      !this.csrfTokenService.validateToken(csrfToken, csrfCookie)
    ) {
      this.logger.warn(`CSRF validation failed for ${req.method} ${req.path}`);
      throw new UnauthorizedException('Invalid CSRF token');
    }

    next();
  }
}
