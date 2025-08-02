import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from './notification-channel.interface';
import { Notification } from '../entities/notification.entity';
import { SmsService } from '../sms.service';

@Injectable()
export class SmsChannel implements NotificationChannel {
  readonly name = 'sms';
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private readonly smsService: SmsService) {}

  async send(notification: Notification): Promise<string> {
    // Expect phoneNumber in notification.metadata.phoneNumber
    const phone = notification.metadata?.phoneNumber;
    if (!phone) {
      throw new Error('Cannot send SMS: no phone number in metadata');
    }
    // SmsService.sendSms(...) should return a message SID/ID (string).
    const providerId = await this.smsService.sendSms({
      to: phone,
      body: notification.textBody || notification.content,
    });
    this.logger.log(`SMS sent to ${phone}: ${providerId}`);
    return providerId || ''; // ensure string
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
