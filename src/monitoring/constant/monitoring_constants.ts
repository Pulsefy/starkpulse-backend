export const MONITORING_CONSTANTS = {
  METRICS: {
    PREFIX: 'nestjs_app_',
    LABELS: {
      METHOD: 'method',
      ROUTE: 'route',
      STATUS_CODE: 'status_code',
      ERROR_TYPE: 'error_type',
    },
    NAMES: {
      HTTP_REQUESTS_TOTAL: 'http_requests_total',
      HTTP_REQUEST_DURATION: 'http_request_duration_seconds',
      HTTP_ERRORS_TOTAL: 'http_errors_total',
      DATABASE_CONNECTIONS: 'database_connections_active',
      DATABASE_QUERIES: 'database_queries_total',
      MEMORY_USAGE: 'memory_usage_bytes',
      CPU_USAGE: 'cpu_usage_percent',
      ACTIVE_SESSIONS: 'active_sessions_total',
      CACHE_HITS: 'cache_hits_total',
      CACHE_MISSES: 'cache_misses_total',
    },
  },
  HEALTH_CHECKS: {
    DATABASE: 'database',
    REDIS: 'redis',
    EXTERNAL_API: 'external_api',
    DISK_SPACE: 'disk_space',
    MEMORY: 'memory',
    CUSTOM: 'custom',
  },
  ALERT_RULES: {
    DEFAULT_COOLDOWN: 300, // 5 minutes
    DEFAULT_DURATION: 60, // 1 minute
    THRESHOLDS: {
      ERROR_RATE: 0.05, // 5%
      RESPONSE_TIME: 5000, // 5 seconds
      CPU_USAGE: 0.8, // 80%
      MEMORY_USAGE: 0.8, // 80%
      DISK_USAGE: 0.9, // 90%
    },
  },
  INTERVALS: {
    METRICS_COLLECTION: 30000, // 30 seconds
    HEALTH_CHECK: 60000, // 1 minute
    ALERT_EVALUATION: 15000, // 15 seconds
    CLEANUP: 3600000, // 1 hour
  },
  RETENTION: {
    METRICS: 7 * 24 * 60 * 60 * 1000, // 7 days
    ALERTS: 30 * 24 * 60 * 60 * 1000, // 30 days
    EVENTS: 14 * 24 * 60 * 60 * 1000, // 14 days
  },
  NOTIFICATION_CHANNELS: {
    WEBHOOK: 'webhook',
    SLACK: 'slack',
    EMAIL: 'email',
    SMS: 'sms',
  },
} as const;

export const DEFAULT_ALERT_RULES = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds 5%',
    condition: {
      metric: 'http_error_rate',
      operator: '>',
      threshold: 0.05,
      duration: 60,
    },
    severity: 'high',
    enabled: true,
    cooldown: 300,
  },
  {
    id: 'slow-response-time',
    name: 'Slow Response Time',
    description: 'Alert when average response time exceeds 5 seconds',
    condition: {
      metric: 'http_response_time_avg',
      operator: '>',
      threshold: 5000,
      duration: 120,
    },
    severity: 'medium',
    enabled: true,
    cooldown: 300,
  },
  {
    id: 'high-cpu-usage',
    name: 'High CPU Usage',
    description: 'Alert when CPU usage exceeds 80%',
    condition: {
      metric: 'cpu_usage_percent',
      operator: '>',
      threshold: 0.8,
      duration: 180,
    },
    severity: 'medium',
    enabled: true,
    cooldown: 600,
  },
  {
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    description: 'Alert when memory usage exceeds 80%',
    condition: {
      metric: 'memory_usage_percent',
      operator: '>',
      threshold: 0.8,
      duration: 180,
    },
    severity: 'medium',
    enabled: true,
    cooldown: 600,
  },
  {
    id: 'database-connection-failure',
    name: 'Database Connection Failure',
    description: 'Alert when database health check fails',
    condition: {
      metric: 'database_health_status',
      operator: '=',
      threshold: 0,
      duration: 30,
    },
    severity: 'critical',
    enabled: true,
    cooldown: 120,
  },
] as const;