import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from './notification-channel.interface';
import { Notification } from '../entities/notification.entity';
import { PushService } from '../push.service';

@Injectable()
export class PushChannel implements NotificationChannel {
  readonly name = 'push';
  private readonly logger = new Logger(PushChannel.name);

  constructor(private readonly pushService: PushService) {}

  async send(notification: Notification): Promise<string> {
    await this.pushService.sendPush(notification);
    this.logger.log(`Push queued/sent for notification ${notification.id}`);
    return '';
  }

  async sendBatch(
    notifications: Notification[],
  ): Promise<
    Array<{ notificationId: string; success: boolean; messageId?: string; error?: string }>
  > {
    const results: Array<{
      notificationId: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    for (const notif of notifications) {
      try {
        const msgId = await this.send(notif);
        results.push({ notificationId: notif.id, success: true, messageId: msgId });
      } catch (err) {
        results.push({
          notificationId: notif.id,
          success: false,
          error: err.message,
        });
      }
    }
    return results;
  }
}
