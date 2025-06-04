import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from './metrics-service';
import { AlertingService } from './alerting-service';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MonitoringInterceptor.name);

  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const method = request.method;
    const url = request.url;
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    this.logger.debug(`Starting ${controller}.${handler} - ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Record successful operation metrics
        this.metricsService.incrementBusinessOperation(
          `${controller}.${handler}`,
          true
        );

        this.logger.debug(
          `Completed ${controller}.${handler} - ${method} ${url} - ${statusCode} - ${duration}ms`
        );

        // Check for slow operations
        if (duration > 5000) {
          this.logger.warn(`Slow operation detected: ${controller}.${handler} took ${duration}ms`);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Record failed operation metrics
        this.metricsService.incrementBusinessOperation(
          `${controller}.${handler}`,
          false
        );

        // Log error details
        this.logger.error(
          `Error in ${controller}.${handler} - ${method} ${url} - ${duration}ms`,
          {
            error: error.message,
            stack: error.stack,
            duration,
            controller,
            handler,
            method,
            url,
          }
        );

        // Send alert for critical errors
        if (this.isCriticalError(error)) {
          this.alertingService.sendAlert('HIGH_ERROR_RATE', {
            controller,
            handler,
            error: error.message,
            method,
            url,
            duration,
          }).catch(alertError => {
            this.logger.error('Failed to send error alert:', alertError);
          });
        }

        return throwError(() => error);
      })
    );
  }

  private isCriticalError(error: any): boolean {
    // Define what constitutes a critical error
    const criticalErrorTypes = [
      'DatabaseError',
      'ConnectionError',
      'TimeoutError',
      'UnauthorizedError',
    ];

    const criticalStatusCodes = [500, 502, 503, 504];
    
    return (
      criticalErrorTypes.some(type => error.constructor.name.includes(type)) ||
      criticalStatusCodes.includes(error.status) ||
      error.message?.toLowerCase().includes('database') ||
      error.message?.toLowerCase().includes('connection')
    );
  }
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly performanceThresholds = {
    fast: 100,      // < 100ms
    medium: 500,    // 100ms - 500ms
    slow: 1000,     // 500ms - 1s
    verySlow: 5000, // > 1s
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = process.hrtime.bigint();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Categorize performance
        const performanceCategory = this.categorizePerformance(duration);
        
        this.logger.debug(`${controller}.${handler} performance: ${duration.toFixed(2)}ms (${performanceCategory})`);

        // Log slow operations with more detail
        if (performanceCategory === 'slow' || performanceCategory === 'very_slow') {
          this.logger.warn(`${performanceCategory.toUpperCase()} operation: ${controller}.${handler} - ${duration.toFixed(2)}ms`);
        }
      })
    );
  }

  private categorizePerformance(duration: number): string {
    if (duration < this.performanceThresholds.fast) return 'fast';
    if (duration < this.performanceThresholds.medium) return 'medium';
    if (duration < this.performanceThresholds.slow) return 'slow';
    return 'very_slow';
  }
}

@Injectable()
export class BusinessMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BusinessMetricsInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const request = context.switchToHttp().getRequest();

    // Extract business-relevant information
    const operationType = this.getOperationType(request.method);
    const resourceType = this.getResourceType(controller);

    return next.handle().pipe(
      tap((result) => {
        // Record successful business operation
        this.metricsService.incrementBusinessOperation(
          `${operationType}_${resourceType}`,
          true
        );

        // Record specific business metrics based on the operation
        this.recordSpecificBusinessMetrics(operationType, resourceType, result);
      }),
      catchError((error) => {
        // Record failed business operation
        this.metricsService.incrementBusinessOperation(
          `${operationType}_${resourceType}`,
          false
        );

        throw error;
      })
    );
  }

  private getOperationType(method: string): string {
    const operationMap = {
      GET: 'read',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };
    return operationMap[method] || 'unknown';
  }

  private getResourceType(controller: string): string {
    // Extract resource type from controller name
    return controller.replace('Controller', '').toLowerCase();
  }

  private recordSpecificBusinessMetrics(
    operation: string,
    resource: string,
    result: any
  ): void {
    try {
      // Record specific metrics based on the operation and resource
      if (operation === 'create' && resource === 'user') {
        this.metricsService.incrementBusinessOperation('user_registration', true);
      }
      
      if (operation === 'create' && resource === 'order') {
        this.metricsService.incrementBusinessOperation('order_placement', true);
      }

      // You can add more specific business logic here
    } catch (error) {
      this.logger.error('Failed to record specific business metrics:', error);
    }
  }
}