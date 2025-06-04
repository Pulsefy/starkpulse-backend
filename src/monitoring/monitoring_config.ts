import { registerAs } from '@nestjs/config';

export interface MonitoringConfig {
  metrics: {
    enabled: boolean;
    endpoint: string;
    prefix: string;
    defaultMetrics: boolean;
  };
  health: {
    endpoint: string;
    timeout: number;
    retries: number;
  };
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    slackWebhook?: string;
    emailNotifications: boolean;
    thresholds: {
      errorRate: number;
      responseTime: number;
      cpuUsage: number;
      memoryUsage: number;
    };
  };
  database: {
    healthCheck: {
      timeout: number;
      query: string;
    };
  };
  logging: {
    level: string;
    format: string;
  };
}

export default registerAs('monitoring', (): MonitoringConfig => ({
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true' || true,
    endpoint: process.env.METRICS_ENDPOINT || '/metrics',
    prefix: process.env.METRICS_PREFIX || 'nestjs_app_',
    defaultMetrics: process.env.DEFAULT_METRICS_ENABLED === 'true' || true,
  },
  health: {
    endpoint: process.env.HEALTH_ENDPOINT || '/health',
    timeout: parseInt(process.env.HEALTH_TIMEOUT || '3000', 10),
    retries: parseInt(process.env.HEALTH_RETRIES || '3', 10),
  },
  alerting: {
    enabled: process.env.ALERTING_ENABLED === 'true' || false,
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    emailNotifications: process.env.EMAIL_NOTIFICATIONS === 'true' || false,
    thresholds: {
      errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'),
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '5000', 10),
      cpuUsage: parseFloat(process.env.CPU_USAGE_THRESHOLD || '0.8'),
      memoryUsage: parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '0.8'),
    },
  },
  database: {
    healthCheck: {
      timeout: parseInt(process.env.DB_HEALTH_TIMEOUT || '2000', 10),
      query: process.env.DB_HEALTH_QUERY || 'SELECT 1',
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
}));