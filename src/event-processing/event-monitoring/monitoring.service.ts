import { Injectable, Logger } from '@nestjs/common';
import { JobId } from 'bull';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private failedEvents = new Map<string | JobId, { error: Error; timestamp: Date }>();


  trackFailedEvent(jobId: JobId, error: Error): void {
    this.logger.error(`Event processing failed for job ${jobId}: ${error.message}`);
    this.failedEvents.set(jobId, {
      error,
      timestamp: new Date()
    });
    
    // Optional: Send to external monitoring system
    this.sendToMonitoringSystem(jobId, error);
  }

  getFailedEvents(): Map<string | JobId, { error: Error; timestamp: Date }> {
    return this.failedEvents;
  }

  private sendToMonitoringSystem(jobId: string | JobId, error: Error): void {
  
    console.log(`Sending failed event ${jobId} to monitoring system`);
  }
}

