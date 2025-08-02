import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationsService } from './notifications.service';

@Processor('notification-queue')
export class NotificationProcessor {
  constructor(private notificationService: NotificationsService) {}

  @Process()
  async handleNotification(job: Job) {
    await this.notificationService.sendNotification(job.data);
  }
}
