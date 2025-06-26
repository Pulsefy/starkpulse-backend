import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
// Remove rxjs imports
// import { Observable, throwError } from 'rxjs';
// import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class RateLimitLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): any {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.connection.remoteAddress;

    this.logger.debug(`Rate limit check passed for IP: ${clientIp}`);

    return next.handle();
  }
}
