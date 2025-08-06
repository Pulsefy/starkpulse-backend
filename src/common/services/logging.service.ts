import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '../../config/config.service';

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, context }) => {
  return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
});

@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService implements LoggerService {
  private context?: string;
  private readonly logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    this.logger = this.createLogger();
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, meta?: any) {
    this.logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, trace?: string, meta?: any) {
    this.logger.error(message, { context: this.context, trace, ...meta });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, meta?: any) {
    this.logger.verbose(message, { context: this.context, ...meta });
  }

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: this.configService.get<string>('LOG_LEVEL') || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });
  }
}
