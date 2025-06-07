export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
  help?: string;
  type?: MetricType;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export interface HealthCheckResult {
  status: HealthStatus;
  info?: Record<string, any>;
  error?: Record<string, any>;
  details?: Record<string, any>;
}

export enum HealthStatus {
  OK = 'ok',
  ERROR = 'error',
  SHUTTING_DOWN = 'shutting_down',
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  cooldown: number; // seconds
}

export interface AlertCondition {
  metric: string;
  operator: ComparisonOperator;
  threshold: number;
  duration: number; // seconds
}

export enum ComparisonOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  EQUAL = '=',
  NOT_EQUAL = '!=',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<=',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Alert {
  id: string;
  rule: AlertRule;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: AlertStatus;
  message: string;
  value: number;
}

export enum AlertStatus {
  TRIGGERED = 'triggered',
  RESOLVED = 'resolved',
  ACKNOWLEDGED = 'acknowledged',
}

export interface MonitoringEvent {
  id: string;
  type: EventType;
  source: string;
  timestamp: Date;
  data: any;
  severity: AlertSeverity;
}

export enum EventType {
  METRIC_THRESHOLD = 'metric_threshold',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  SERVICE_DOWN = 'service_down',
  HIGH_ERROR_RATE = 'high_error_rate',
  SLOW_RESPONSE = 'slow_response',
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    rate: number;
    errors: number;
    errorRate: number;
  };
  response: {
    averageTime: number;
    p95: number;
    p99: number;
  };
  database: {
    connections: number;
    activeQueries: number;
    slowQueries: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}