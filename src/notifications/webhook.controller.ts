import {
  Controller,
  Post,
  Body,
  Query,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './entities/notification.entity';

@Controller('notifications/webhook')
export class NotificationWebhookController {
  private readonly logger = new Logger(NotificationWebhookController.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  @Post('email-status')
  async handleEmailStatus(@Body() payload: any, @Query('notificationId') qid?: string) {
    let notificationId: string | null = null;

    if (qid) {
      notificationId = qid;
    } else if (payload['X-Mailgun-Variables']) {
      try {
        const vars = JSON.parse(payload['X-Mailgun-Variables'] || '{}');
        notificationId = vars.notificationId;
      } catch {
        throw new BadRequestException('Invalid X-Mailgun-Variables JSON');
      }
    } else if (payload['notificationId']) {
      notificationId = payload['notificationId'];
    }

    if (!notificationId) {
      this.logger.warn('Email webhook missing notificationId');
      throw new BadRequestException('Missing notificationId');
    }

    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      this.logger.warn(`Email webhook: notification not found: ${notificationId}`);
      return;
    }

    const eventType = payload.event || payload.eventType || payload['event'];

    if (eventType === 'delivered') {
      notification.deliveredAt = payload.timestamp
        ? new Date(Number(payload.timestamp) * 1000)
        : new Date();
    } else if (eventType === 'opened') {
      notification.readAt = payload.timestamp
        ? new Date(Number(payload.timestamp) * 1000)
        : new Date();
    } else if (eventType === 'failed' || eventType === 'bounce') {
      notification.errorReason = payload['delivery-status']?.message || 'Email delivery failed';
    }

    await this.notificationRepo.save(notification);
  }

  @Post('sms-status')
  async handleSmsStatus(@Body() payload: any, @Query('notificationId') qid?: string) {
    const notificationId = qid || payload.notificationId;
    if (!notificationId) {
      this.logger.warn('SMS webhook missing notificationId');
      throw new BadRequestException('Missing notificationId');
    }

    const notif = await this.notificationRepo.findOne({ where: { id: notificationId } });
    if (!notif) {
      this.logger.warn(`SMS webhook: notification not found: ${notificationId}`);
      return;
    }

    const status = payload.MessageStatus || payload.message_status;
    if (status === 'delivered') {
      notif.deliveredAt = new Date();
    } else if (status === 'failed') {
      notif.errorReason = payload.ErrorMessage || 'SMS delivery failed';
    }

    await this.notificationRepo.save(notif);
  }
}
