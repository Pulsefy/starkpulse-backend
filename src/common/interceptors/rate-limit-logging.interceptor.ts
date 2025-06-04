import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { RateLimitException } from '../exceptions/rate-limit.exception';

@Injectable()
export class RateLimitLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ipAddress = request.headers['x-forwarded-for'] || request.connection?.remoteAddress;
    const endpoint = `${request.method} ${request.url}`;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.debug(
          `Rate limit check passed: ${endpoint} - User: ${userId || 'anonymous'} - IP: ${ipAddress} - Duration: ${duration}ms`
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        if (error instanceof RateLimitException) {
          this.logger.warn(
            `Rate limit exceeded: ${endpoint} - User: ${userId || 'anonymous'} - IP: ${ipAddress} - ` +
            `Limit: ${error.limit} - Remaining: ${error.remaining} - RetryAfter: ${error.retryAfter}s - Duration: ${duration}ms`
          );
        } else {
          this.logger.error(
            `Rate limit error: ${endpoint} - User: ${userId || 'anonymous'} - IP: ${ipAddress} - ` +
            `Error: ${error.message} - Duration: ${duration}ms`
          );
        }
        
        throw error;
      }),
    );
  }
}