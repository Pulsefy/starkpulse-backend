import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggingService } from '../services/logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly loggingService: LoggingService) {
    this.loggingService.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, headers, query, params } = req;
    const userAgent = headers['user-agent'] || '';
    const ip = req.ip;
    const requestId = headers['x-request-id'] || Math.random().toString(36).substring(7);

    const startTime = process.hrtime();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const duration = seconds * 1000 + nanoseconds / 1000000;

          this.loggingService.log('Request completed', {
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration.toFixed(2)}ms`,
            userAgent,
            ip,
            query,
            params,
            responseSize: JSON.stringify(data).length,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const duration = seconds * 1000 + nanoseconds / 1000000;

          this.loggingService.error('Request failed', error.stack, {
            requestId,
            method,
            url,
            statusCode: error.status || 500,
            duration: `${duration.toFixed(2)}ms`,
            userAgent,
            ip,
            query,
            params,
            error: {
              name: error.name,
              message: error.message,
            },
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}
