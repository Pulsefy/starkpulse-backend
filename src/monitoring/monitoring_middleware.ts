import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics-service';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MonitoringMiddleware.name);

  constructor(private readonly metricsService: MetricsService) {}

  use(req: RequestWithStartTime, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    req.startTime = startTime;

    // Extract request information
    const method = req.method;
    const route = this.extractRoute(req);
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;

    // Log request start
    this.logger.debug(`${method} ${route} - Start`, {
      method,
      route,
      ip,
      userAgent: userAgent.substring(0, 100), // Truncate long user agents
    });

    // Override res.end to capture response data
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding?: any, cb?: () => void): Response {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const statusCode = res.statusCode.toString();

      // Record metrics
      try {
        // HTTP request metrics
        this.metricsService.incrementHttpRequests(method, route, statusCode);
        this.metricsService.recordHttpRequestDuration(method, route, statusCode, duration);

        // Business operation metrics
        const isSuccess = res.statusCode < 400;
        this.metricsService.incrementBusinessOperation('http_request', isSuccess);

        // Update error rate if needed
        if (!isSuccess) {
          this.metricsService.updateErrorRate(calculateErrorRate());
        }
      } catch (error) {
        // Don't let metrics recording break the response
        console.error('Failed to record metrics:', error);
      }

      // Log request completion
      const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
      const logger = new Logger(MonitoringMiddleware.name);
      
      logger[logLevel](`${method} ${route} - ${statusCode} - ${duration}ms`, {
        method,
        route,
        statusCode: res.statusCode,
        duration,
        ip,
        success: res.statusCode < 400,
      });

      // Call original end method and return its result
      // Support all overloads of res.end
      return originalEnd.call(this, chunk, encoding, cb);
    } as typeof res.end;

    next();
  }

  private extractRoute(req: Request): string {
    // Try to get the route pattern from the request
    const route = req.route?.path || req.url;
    
    // Clean up the route for better grouping in metrics
    if (typeof route === 'string') {
      return this.normalizeRoute(route);
    }
    
    return req.url || 'unknown';
  }

  private normalizeRoute(route: string): string {
    // Remove query parameters
    const pathOnly = route.split('?')[0];
    
    // Replace common ID patterns with placeholders for better metric grouping
    return pathOnly
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid') // Replace UUIDs
      .replace(/\/[a-f0-9]{24}/g, '/:objectId') // Replace MongoDB ObjectIds
      || '/';
  }
}

// Helper function to calculate error rate (simplified version)
function calculateErrorRate(): number {
  // In a real implementation, you would track requests over time
  // This is a simplified placeholder
  return 0;
}

@Injectable()
export class ResponseTimeMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ResponseTimeMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // Add response time header
      res.set('X-Response-Time', `${duration.toFixed(2)}ms`);

      // Log slow requests
      if (duration > 1000) { // Log requests slower than 1 second
        this.logger.warn(`Slow request detected: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
      }
    });

    next();
  }
}

@Injectable()
export class ErrorTrackingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorTrackingMiddleware.name);

  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Capture and track errors
    const originalSend = res.send;
    
    res.send = function(body: any) {
      if (res.statusCode >= 400) {
        const errorInfo = {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        };

        // Log error
        const logger = new Logger(ErrorTrackingMiddleware.name);
        logger.error(`HTTP Error: ${req.method} ${req.url} - ${res.statusCode}`, errorInfo);

        // Record error metrics
        try {
          this.metricsService.incrementBusinessOperation('http_error', false);
        } catch (error) {
          console.error('Failed to record error metrics:', error);
        }
      }

      return originalSend.call(this, body);
    };

    next();
  }
}

@Injectable()
export class SecurityMonitoringMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMonitoringMiddleware.name);
  private readonly suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // XSS attempts
    /union\s+select/gi, // SQL injection
    /exec\s*\(/gi, // Command injection
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    const url = req.url;
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});

    // Check for suspicious patterns
    const suspicious = this.suspiciousPatterns.some(pattern => 
      pattern.test(url) || pattern.test(body) || pattern.test(query)
    );

    if (suspicious) {
      this.logger.warn(`Suspicious request detected: ${req.method} ${url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
      });
    }

    // Rate limiting indicators
    const forwardedFor = req.get('X-Forwarded-For');
    const realIp = req.get('X-Real-IP');
    
    if (forwardedFor || realIp) {
      this.logger.debug('Request through proxy', {
        ip: req.ip,
        forwardedFor,
        realIp,
      });
    }

    next();
  }
}