import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy
    const csp =
      "default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://alpha-mainnet.starknet.io;";
    res.setHeader('Content-Security-Policy', csp);

    // Validate CSP header
    if (!csp || typeof csp !== 'string' || !csp.includes("default-src")) {
      this.logger.warn('CSP header is missing or malformed!');
    }

    // Prevent browsers from incorrectly detecting non-scripts as scripts
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Strict Transport Security
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );

    // Prevents the browser from rendering the page if it detects XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevents the page from being framed (clickjacking protection)
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    // Cache Control
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    } else {
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    }

    next();
  }
}
