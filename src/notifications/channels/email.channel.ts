import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from './notification-channel.interface';
import { Notification } from '../entities/notification.entity';
import { MailService } from '../mail.service';

@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly name = 'email';
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly mailService: MailService) {}

  async send(notification: Notification): Promise<string> {
    // If MailService.sendEmail(...) returns void, we must still return a string.
    // Adjust MailService to return the actual message ID when it can.
    await this.mailService.sendEmail(notification);
    this.logger.log(`Email queued/sent for notification ${notification.id}`);
    return ''; // ← return empty string if no provider ID is available
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
