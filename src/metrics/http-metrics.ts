/* eslint-disable prettier/prettier */
import { Histogram } from 'prom-client';

export const httpRequestDurationMicroseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.75, 1, 1.5, 2, 5], // SLA performance buckets
});
