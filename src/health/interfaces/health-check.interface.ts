export type ServiceStatus = 'healthy' | 'unhealthy';

export interface ServiceCheck {
  status: 'up' | 'down';
  error?: string;
}

export interface HealthCheckResult {
  status: ServiceStatus;
  timestamp: string;
  services: {
    database: ServiceCheck;
    [key: string]: ServiceCheck;
  };
  info: {
    version: string;
    environment: string;
    [key: string]: any;
  };
}
