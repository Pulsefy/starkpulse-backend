import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Simple XSS sanitization (for demonstration; use a robust library in production)
function sanitizeXSS(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/<.*?>/g, '');
  } else if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      value[key] = sanitizeXSS(value[key]);
    }
  }
  return value;
}

@Injectable()
export class SanitizationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SanitizationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    req.body = sanitizeXSS({ ...req.body });
    req.query = sanitizeXSS({ ...req.query });
    req.params = sanitizeXSS({ ...req.params });
    this.logger.debug('Request sanitized for XSS and dangerous content');
    next();
  }
} 