import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsController } from './metrics-controller';
import { HealthController } from './health-controller';
import { HealthService } from './health-service';
import { MetricsService } from './metrics-service';
import { AlertingService } from './alerting-service';
import { MonitoringService } from './monitoring-service';
import { DatabaseHealthIndicator } from './database-health-indicator';
import { CustomHealthIndicator } from './custom_health_indicator';
import { MetricsCollectorService } from './metrics_collector_service';
import { MetricsProviders } from './metrics.providers';
import { Registry } from 'prom-client';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';


@Module({
  imports: [
    TerminusModule,
    HttpModule,
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'nestjs_app_',
        },
      },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    HealthService,
    MetricsService,
    {
      provide: 'PROM_REGISTRY',
      useFactory: () => {
        const client = require('prom-client');
        return client.register as Registry;
      },
    },
    AlertingService,
    MonitoringService,
    DatabaseHealthIndicator,
    CustomHealthIndicator,
    MetricsCollectorService,
    ...MetricsProviders
  ],
  exports: [
    HealthService,
    MetricsService,
    AlertingService,
    MonitoringService,
  ],
})
export class MonitoringModule {}