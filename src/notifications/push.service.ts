import { Injectable } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import * as webpush from 'web-push';

@Injectable()
export class PushService {
  constructor() {
    webpush.setVapidDetails(
      'mailto:your@email.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }

  async sendPush(notification: Notification) {
    const subscription = notification.user.pushSubscription;

    if (!subscription) {
      console.warn(`No push subscription for user ${notification.user.id}`);
      return;
    }

    const payload = JSON.stringify({
      title: 'New Notification',
      body: notification.content,
    });

    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`Push sent to user ${notification.user.id}`);
    } catch (error) {
      console.error(`Push failed: ${error.message}`);
      throw error;
    }
  }
}