import { LoggingService } from '../services/logging.service';

export class PerformanceLogger {
  private static loggingService: LoggingService;

  static initialize(loggingService: LoggingService) {
    PerformanceLogger.loggingService = loggingService;
    PerformanceLogger.loggingService.setContext('PerformanceLogger');
  }

  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {},
  ): Promise<T> {
    const startTime = process.hrtime();
    try {
      const result = await fn();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      PerformanceLogger.loggingService.log(`Operation completed: ${operation}`, {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        ...metadata,
      });

      return result;
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      PerformanceLogger.loggingService.error(
        `Operation failed: ${operation}`,
        error.stack,
        {
          operation,
          duration: `${duration.toFixed(2)}ms`,
          error: {
            name: error.name,
            message: error.message,
          },
          ...metadata,
        },
      );

      throw error;
    }
  }

  static startTimer(operation: string) {
    const startTime = process.hrtime();
    return {
      end: (metadata: Record<string, any> = {}) => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        PerformanceLogger.loggingService.log(`Timer completed: ${operation}`, {
          operation,
          duration: `${duration.toFixed(2)}ms`,
          ...metadata,
        });

        return duration;
      },
    };
  }
} 