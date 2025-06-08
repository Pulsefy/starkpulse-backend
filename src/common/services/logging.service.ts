import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import { ConfigService } from '../../config/config.service';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService implements LoggerService {
  private context?: string;
  private logger: Logger;

  constructor(private configService: ConfigService) {
    const { combine, timestamp, printf, colorize, json } = format;

    const logFormat = combine(
      timestamp(),
      json(),
      printf(({ timestamp, level, message, context, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          context,
          message,
          ...meta,
        });
      }),
    );

    this.logger = createLogger({
      level: this.configService.logLevel || 'info',
      format: logFormat,
      transports: [
        new transports.Console({
          format: combine(colorize(), logFormat),
        }),
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        new transports.File({
          filename: 'logs/combined.log',
        }),
      ],
    });
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
} 