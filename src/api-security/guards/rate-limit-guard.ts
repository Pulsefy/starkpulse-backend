import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly limits = new Map<
    string,
    { count: number; lastReset: number }
  >();
  private readonly WINDOW_MS = 60 * 1000;
  private readonly MAX_REQUESTS = 10;
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? '';

    const now = Date.now();
    const client = this.limits.get(ip) || { count: 0, lastReset: now };

    if (now - client.lastReset > this.WINDOW_MS) {
      client.count = 1;
      client.lastReset = now;
    } else {
      client.count++;
    }

    this.limits.set(ip, client);

    if (client.count > this.MAX_REQUESTS) {
      this.logger.warn(
        `Rate limit exceeded for IP: ${ip}. Count: ${client.count}`,
      );
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(
      `Rate Limit Guard: IP ${ip}, Count: ${client.count}/${this.MAX_REQUESTS}`,
    );
    return true;
  }
}
