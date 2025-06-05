import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DatabaseHealthService } from '../services/database-health.service';

@Injectable()
export class DatabasePerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DatabasePerformanceInterceptor.name);

  constructor(private readonly healthService: DatabaseHealthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const endpoint = `${request.method} ${request.url}`;

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.healthService.recordQueryMetric(responseTime);

        if (responseTime > 1000) {
          this.logger.warn(
            `Slow endpoint detected: ${endpoint} took ${responseTime}ms`,
          );
        }
      }),
    );
  }
}
