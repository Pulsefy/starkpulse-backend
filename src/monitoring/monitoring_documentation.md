# Monitoring and Alerting Documentation

## Overview

This document provides comprehensive information about the monitoring and alerting system implemented for the NestJS application with PostgreSQL backend.

## Architecture

The monitoring system consists of several key components:

- **Metrics Collection**: Automated collection of application and system metrics
- **Health Checks**: Regular health status verification of critical components
- **Alerting System**: Rule-based alerting with multiple notification channels
- **Custom Indicators**: Application-specific health and performance indicators

## Components

### Core Services

1. **MonitoringService**: Central orchestrator for all monitoring activities
2. **MetricsService**: Handles metric collection and exposure
3. **HealthService**: Manages health check execution and status reporting
4. **AlertingService**: Processes alert rules and sends notifications
5. **MetricsCollectorService**: Automated metric collection with scheduling

### Health Indicators

1. **DatabaseHealthIndicator**: PostgreSQL connection and query health
2. **CustomHealthIndicator**: Application-specific health checks

### Controllers

1. **HealthController**: Exposes health check endpoints
2. **MetricsController**: Exposes metrics endpoints for Prometheus

### Middleware & Interceptors

1. **MonitoringMiddleware**: Request/response logging and metrics
2. **MonitoringInterceptor**: Method-level performance monitoring

## Configuration

### Environment Variables

Copy the `monitoring.env.example` file and configure the following variables:

```bash
# Basic Monitoring
METRICS_ENABLED=true
HEALTH_ENDPOINT=/health
ALERTING_ENABLED=true

# Thresholds
ERROR_RATE_THRESHOLD=0.05
RESPONSE_TIME_THRESHOLD=5000
CPU_USAGE_THRESHOLD=0.8
MEMORY_USAGE_THRESHOLD=0.8
```

### Module Configuration

The monitoring module is configured in `monitoring.config.ts` with the following sections:

- **Metrics Configuration**: Prometheus integration and custom metrics
- **Health Check Configuration**: Timeout and retry settings
- **Alerting Configuration**: Notification channels and thresholds
- **Database Configuration**: Health check queries and timeouts

## Metrics

### Application Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | HTTP request duration |
| `http_errors_total` | Counter | Total HTTP errors |
| `database_connections_active` | Gauge | Active database connections |
| `database_queries_total` | Counter | Total database queries |
| `memory_usage_bytes` | Gauge | Memory usage in bytes |
| `cpu_usage_percent` | Gauge | CPU usage percentage |

### System Metrics

- CPU usage and load average
- Memory utilization
- Disk space usage
- Network I/O statistics

### Custom Metrics

You can add custom metrics using the MetricsService:

```typescript
// Example: Custom business metric
this.metricsService.incrementCounter('user_signups_total', { source: 'web' });
this.metricsService.updateGauge('active_users', 1250);
```

## Health Checks

### Available Health Checks

1. **Database Health**: Verifies PostgreSQL connectivity and responsiveness
2. **Memory Health**: Checks system memory usage
3. **Disk Health**: Monitors disk space availability
4. **Custom Health**: Application-specific health indicators

### Health Check Endpoints

- `GET /health` - Overall application health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### Health Check Response Format

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "message": "Connection successful"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up",
      "message": "Connection successful"
    }
  }
}
```

## Alerting

### Default Alert Rules

1. **High Error Rate**: Triggers when error rate > 5% for 1 minute
2. **Slow Response Time**: Triggers when avg response time > 5s for 2 minutes
3. **High CPU Usage**: Triggers when CPU > 80% for 3 minutes
4. **High Memory Usage**: Triggers when memory > 80% for 3 minutes
5. **Database Connection Failure**: Triggers on health check failure

### Notification Channels

- **Webhook**: HTTP POST to specified URL
- **Slack**: Slack channel notifications
- **Email**: SMTP-based email alerts
- **Custom**: Extensible notification system

### Alert Severity Levels

- **LOW**: Informational alerts
- **MEDIUM**: Warning conditions requiring attention
- **HIGH**: Error conditions requiring immediate attention
- **CRITICAL**: Service-affecting issues requiring urgent response

## Integration

### Prometheus Integration

The application exposes metrics at `/metrics` endpoint in Prometheus format:

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/users",status_code="200"} 1524
```

### Grafana Dashboards

Import the provided Grafana dashboard JSON files:

1. `application-overview.json` - Application performance overview
2. `system-metrics.json` - System resource monitoring
3. `database-monitoring.json` - PostgreSQL specific metrics

### Log Aggregation

Structured JSON logging is configured for integration with:

- ELK Stack (Elasticsearch, Logstash, Kibana)
- Fluentd
- CloudWatch Logs
- Splunk

## Deployment Considerations

### Docker Configuration

```dockerfile
# Health check in Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Kubernetes Configuration

```yaml
# Kubernetes liveness and readiness probes
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Troubleshooting

### Common Issues

1. **Metrics Not Appearing**
   - Verify METRICS_ENABLED=true
   - Check /metrics endpoint accessibility
   - Validate Prometheus configuration

2. **Health Checks Failing**
   - Verify database connectivity
   - Check timeout configurations
   - Review health check logs

3. **Alerts Not Firing**
   - Verify ALERTING_ENABLED=true
   - Check webhook URLs and credentials
   - Validate alert rule configurations

### Debug Commands

```bash
# Check health status
curl http://localhost:3000/health

# View metrics
curl http://localhost:3000/metrics

# Test webhook
curl -X POST http://localhost:3000/test-alert
```

## Performance Impact

The monitoring system is designed with minimal performance impact:

- **Metrics Collection**: ~1-2ms overhead per request
- **Health Checks**: Run asynchronously every 60 seconds
- **Memory Usage**: ~10-15MB additional memory
- **CPU Usage**: <1% additional CPU utilization

## Security Considerations

- Metrics endpoints should be secured in production
- Webhook URLs should use HTTPS
- Sensitive data is excluded from metrics and logs
- Authentication required for administrative endpoints

## Maintenance

### Regular Tasks

1. **Weekly**: Review alert configurations and thresholds
2. **Monthly**: Clean up old metrics and alert history
3. **Quarterly**: Update monitoring dependencies
4. **Annually**: Review and update monitoring strategy

### Monitoring the Monitoring

- Set up alerts for monitoring system failures
- Monitor metrics collection lag
- Track alert delivery success rates
- Regular testing of notification channels

## Extensions

The monitoring system is designed to be extensible:

1. **Custom Metrics**: Add business-specific metrics
2. **Additional Health Checks**: Create domain-specific health indicators
3. **New Alert Rules**: Define custom alerting conditions
4. **Integration APIs**: Connect with external monitoring systems

## Support

For monitoring system issues:

1. Check application logs for monitoring-related errors
2. Verify configuration in monitoring.config.ts
3. Test individual components using provided debug endpoints
4. Consult the troubleshooting section above

For questions or enhancements, refer to the development team documentation.