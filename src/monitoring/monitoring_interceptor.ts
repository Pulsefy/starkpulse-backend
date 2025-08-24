import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { MetricsService } from './metrics-service';
import { AlertingService } from './alerting-service';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MonitoringInterceptor.name);

  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route = request.route?.path || request.url;

    try {
      const result = next.handle();

      // Record metrics after request completes
      const duration = Date.now() - start;
      this.metricsService.recordHttpRequestDuration(
        method,
        route,
        '200',
        duration,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Request failed:', error);
      this.metricsService.recordHttpRequestDuration(
        method,
        route,
        '500',
        duration,
      );
      this.alertingService.sendAlert('request_error', { error: error.message });
      throw error;
    }
  }
}

// If you have a second interceptor class in the same file, apply similar changes
@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceMonitoringInterceptor.name);

  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();

    try {
      const result = next.handle();

      // Monitor performance
      const duration = Date.now() - start;
      if (duration > 5000) {
        // Alert if request takes more than 5 seconds
        this.alertingService.sendAlert(
          'slow_request',
          {
            url: request.url,
            method: request.method,
            duration,
          },
          'medium',
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Performance monitoring error:', error);
      throw error;
    }
  }
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly performanceThresholds = {
    fast: 100, // < 100ms
    medium: 500, // 100ms - 500ms
    slow: 1000, // 500ms - 1s
    verySlow: 5000, // > 1s
  };

  intercept(context: ExecutionContext, next: CallHandler): any {
    const startTime = process.hrtime.bigint();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    const result = next.handle();

    // Simple promise-based handling instead of rxjs
    if (result && typeof result.toPromise === 'function') {
      return result.toPromise().then(
        (data: any) => {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - startTime) / 1000000;

          const performanceCategory = this.categorizePerformance(duration);
          this.logger.debug(
            `${controller}.${handler} performance: ${duration.toFixed(2)}ms (${performanceCategory})`,
          );

          return data;
        },
        (error: any) => {
          this.logger.error(`Error in ${controller}.${handler}:`, error);
          throw error;
        },
      );
    }

    return result;
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

  intercept(context: ExecutionContext, next: CallHandler): any {
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const request = context.switchToHttp().getRequest();

    const operationType = this.getOperationType(request.method);
    const resourceType = this.getResourceType(controller);

    const result = next.handle();

    if (result && typeof result.toPromise === 'function') {
      return result.toPromise().then(
        (data: any) => {
          this.metricsService.incrementBusinessOperation(
            `${operationType}_${resourceType}`,
            true,
          );
          this.recordSpecificBusinessMetrics(operationType, resourceType, data);
          return data;
        },
        (error: any) => {
          this.metricsService.incrementBusinessOperation(
            `${operationType}_${resourceType}`,
            false,
          );
          throw error;
        },
      );
    }

    return result;
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
    result: any,
  ): void {
    try {
      // Record specific metrics based on the operation and resource
      if (operation === 'create' && resource === 'user') {
        this.metricsService.incrementBusinessOperation(
          'user_registration',
          true,
        );
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
