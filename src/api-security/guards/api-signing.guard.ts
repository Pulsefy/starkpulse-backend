import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac } from 'crypto';

@Injectable()
export class ApiSigningGuard implements CanActivate {
  private readonly logger = new Logger(ApiSigningGuard.name);
  private readonly API_SECRET = 'your-super-secret-api-key-for-signing';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-api-signature'] as string;
    const timestamp = request.headers['x-api-timestamp'] as string;
    const body = JSON.stringify(request.body || {});
    const url = request.originalUrl;
    const method = request.method;

    if (!signature || !timestamp) {
      this.logger.warn(
        'API Signing Guard: Missing signature or timestamp headers.',
      );
      throw new UnauthorizedException('Missing API signature or timestamp.');
    }

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    if (Math.abs(Date.now() - parseInt(timestamp, 10)) > FIVE_MINUTES_MS) {
      this.logger.warn(
        `API Signing Guard: Replay attack detected for timestamp ${timestamp}.`,
      );
      throw new UnauthorizedException(
        'Request timestamp out of sync or too old.',
      );
    }

    const dataToSign = `${method}:${url}:${timestamp}:${body}`;
    const expectedSignature = createHmac('sha256', this.API_SECRET)
      .update(dataToSign)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.warn(
        `API Signing Guard: Invalid signature for ${url}. Expected: ${expectedSignature}, Received: ${signature}`,
      );
      throw new UnauthorizedException('Invalid API signature.');
    }

    this.logger.log(
      `API Signing Guard: Request signature verified for ${url}.`,
    );
    return true;
  }
}
