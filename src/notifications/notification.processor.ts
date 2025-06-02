import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import type { NotificationsService } from './notifications.service';

@Processor('notification-queue')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('process-notification')
  async handleNotification(job: Job<{ notificationId: string }>) {
    this.logger.debug(
      `Processing notification job ${job.id} for notification ${job.data.notificationId}`,
    );

    try {
      await this.notificationsService.processNotification(
        job.data.notificationId,
      );
      this.logger.debug(
        `Successfully processed notification ${job.data.notificationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${job.data.notificationId}: ${error.message}`,
      );
      throw error; // Rethrow to let Bull handle retries
    }
  }
}
