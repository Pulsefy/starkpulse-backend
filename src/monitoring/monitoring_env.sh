# Monitoring Configuration
METRICS_ENABLED=true
METRICS_ENDPOINT=/metrics
METRICS_PREFIX=nestjs_app_
DEFAULT_METRICS_ENABLED=true

# Health Check Configuration
HEALTH_ENDPOINT=/health
HEALTH_TIMEOUT=3000
HEALTH_RETRIES=3

# Database Health Check
DB_HEALTH_TIMEOUT=2000
DB_HEALTH_QUERY=SELECT 1

# Alerting Configuration
ALERTING_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EMAIL_NOTIFICATIONS=false

# Alert Thresholds
ERROR_RATE_THRESHOLD=0.05
RESPONSE_TIME_THRESHOLD=5000
CPU_USAGE_THRESHOLD=0.8
MEMORY_USAGE_THRESHOLD=0.8

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Prometheus Configuration (if using external Prometheus)
PROMETHEUS_ENDPOINT=http://localhost:9090
PROMETHEUS_JOB_NAME=nestjs-app

# Grafana Configuration (if using Grafana)
GRAFANA_URL=http://localhost:3000
GRAFANA_API_KEY=your-grafana-api-key

# External Monitoring Services
# New Relic
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key
NEW_RELIC_APP_NAME=nestjs-monitoring-app

# DataDog
DATADOG_API_KEY=your-datadog-api-key
DATADOG_APP_KEY=your-datadog-app-key

# Sentry
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/project-id