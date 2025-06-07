// src/monitoring/metrics.providers.ts
import { makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export const MetricsProviders = [
  makeCounterProvider({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'statusCode'],
  }),
  makeHistogramProvider({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'statusCode'],
    buckets: [50, 100, 200, 300, 400, 500, 1000],
  }),
  makeGaugeProvider({
    name: 'database_connections_active',
    help: 'Number of active DB connections',
  }),
  makeGaugeProvider({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type'],
  }),
  makeCounterProvider({
    name: 'business_operations_total',
    help: 'Total number of business operations',
    labelNames: ['operation', 'success'],
  }),
  makeGaugeProvider({
    name: 'error_rate',
    help: 'Application error rate',
  }),
];
