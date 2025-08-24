import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Enhanced error handling for BlockchainError
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorCode: string | undefined = undefined;
    let errorContext: any = undefined;

    if ((exception as any)?.code && (exception as any)?.name === 'BlockchainError') {
      // BlockchainError detected
      errorCode = (exception as any).code;
      message = (exception as any).message;
      errorContext = (exception as any).context;
      status = HttpStatus.BAD_GATEWAY;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'object' ? (message as any).message : message,
      ...(errorCode && { errorCode }),
      ...(errorContext && { errorContext }),
    };

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${JSON.stringify(errorResponse)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }
}
