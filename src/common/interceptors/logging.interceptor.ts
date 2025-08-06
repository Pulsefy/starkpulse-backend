import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): any {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    this.logger.log(`${method} ${url} - Start`);

    const result = next.handle();

    // Simple logging without rxjs
    const duration = Date.now() - now;
    this.logger.log(`${method} ${url} - Completed in ${duration}ms`);

    return result;
  }
}
