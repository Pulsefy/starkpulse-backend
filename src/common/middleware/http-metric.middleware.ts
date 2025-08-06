/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { httpRequestDurationMicroseconds } from '../../metrics/http-metrics';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const end = httpRequestDurationMicroseconds.startTimer();

    res.on('finish', () => {
      end({
        method: req.method,
        route:
          (typeof req.route === 'object' && req.route && 'path' in req.route
            ? (req.route as { path?: string }).path
            : undefined) || req.path,
        code: res.statusCode,
      });
    });

    next();
  }
}
