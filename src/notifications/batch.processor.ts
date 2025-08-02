import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm'; // ← import In

import { Notification } from './entities/notification.entity';
import { NotificationStatus } from './enums/notificationStatus.enum';
import { NotificationsService } from './notifications.service';
import { NotificationChannel } from './channels/notification-channel.interface';

@Injectable()
export class NotificationBatchProcessor {
  private readonly logger = new Logger(NotificationBatchProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('*/5 * * * *') // runs every 5 minutes
  async handleBatch() {
    this.logger.log('Batch job started: fetching pending notifications');

    // Fetch all notifications with status = PENDING
    const pending = await this.notificationRepo.find({
      where: { status: NotificationStatus.PENDING },
    });

    if (pending.length === 0) {
      this.logger.log('No pending notifications to process.');
      return;
    }

    // Group by channel
    const grouped: Record<string, Notification[]> = {};
    for (const notif of pending) {
      const ch = notif.channel;
      if (!grouped[ch]) grouped[ch] = [];
      grouped[ch].push(notif);
    }

    // For each channel group:
    for (const channelName of Object.keys(grouped)) {
      const items = grouped[channelName];
      this.logger.log(`Processing ${items.length} notifications on channel ${channelName}`);

      await this.notificationRepo.update(
        { id: In(items.map((i) => i.id)) },
        { status: NotificationStatus.PROCESSING },
      );

      try {
        //Get the channel provider from the service
        const channelProvider: NotificationChannel =
          this.notificationsService.getChannelProvider(channelName as any);

        // For each notification, render template & update htmlBody/textBody
        for (const notif of items) {
          const tplKey = notif.templateKey || notif.type?.toLowerCase() || '';
          let rendered: string;
          try {
            rendered = this.notificationsService['templateService'].render(
              notif.channel as any,
              tplKey,
              {
                title: notif.title,
                content: notif.content,
                metadata: notif.metadata || {},
                actionUrl: (notif as any).actionUrl,
                imageUrl: (notif as any).imageUrl,
              },
            );
          } catch (err) {
            this.logger.error(`Template render failed for ${notif.id}: ${err.message}`);
            rendered = notif.content;
          }

          if (notif.channel === 'email') {
            notif.htmlBody = rendered;
          } else {
            notif.textBody = rendered;
          }
          await this.notificationRepo.save(notif);
        }

        // Call sendBatch(...) for this channel
        const sendResults = await channelProvider.sendBatch!(items);

        // Update each notification based on results
        for (const result of sendResults) {
          const notif = items.find((i) => i.id === result.notificationId);
          if (!notif) continue;
          if (result.success) {
            notif.status = NotificationStatus.SENT;
            notif.providerMessageId = result.messageId || '';
          } else {
            notif.status = NotificationStatus.FAILED;
            notif.retryCount = (notif.retryCount || 0) + 1;
            notif.errorReason = result.error;
          }
          await this.notificationRepo.save(notif);
        }
      } catch (err) {
        // If the entire batch fails, mark all as FAILED
        this.logger.error(`Batch send failed on channel ${channelName}: ${err.message}`);
        for (const notif of items) {
          notif.status = NotificationStatus.FAILED;
          notif.retryCount = (notif.retryCount || 0) + 1;
          notif.errorReason = err.message;
          await this.notificationRepo.save(notif);
        }
      }
    }

    this.logger.log('Batch job completed.');
  }
}
