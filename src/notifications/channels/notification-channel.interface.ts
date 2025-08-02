import { Notification } from '../entities/notification.entity';

export interface NotificationChannel {
  /**
   * Unique channel name (e.g. 'email', 'push', 'sms').
   */
  readonly name: string;

  /**
   * Send a single notification. Returns provider’s message ID (if any).
   * If underlying MailService/PushService returns void, it can return an empty string here.
   */
  send(notification: Notification): Promise<string>;

  /**
   * (Optional) Send a batch of notifications. Return an array of results.
   */
  sendBatch?(notifications: Notification[]): Promise<
    Array<{
      notificationId: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>
  >;
}
