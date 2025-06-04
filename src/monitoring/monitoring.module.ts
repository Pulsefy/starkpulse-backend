import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule {}
