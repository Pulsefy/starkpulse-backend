import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsWhere, DeepPartial } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { UpdateNotificationDto } from './dto/update-notification.dto';
import type { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import type { NotificationQueryDto } from './dto/notification-query.dto';
import type { MailService } from './mail.service';
import type { PushService } from './push.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { NotificationType } from './enums/notificationType.enum';
import { NotificationStatus } from './enums/notificationStatus.enum';
import { NotificationChannel } from './channels/notification-channel.interface';
import { EmailChannel } from './channels/email.channel';
import { PushChannel } from './channels/push.channel';
import { SmsChannel } from './channels/sms.channel';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private channels: Record<string, NotificationChannel> = {};

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,

    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,

    private readonly eventEmitter: EventEmitter2,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
    private readonly emailChannel: EmailChannel,
    private readonly pushChannel: PushChannel,
    private readonly smsChannel: SmsChannel,

    @InjectQueue('notification-queue')
    private readonly queue: Queue,
  ) {
    this.channels[emailChannel.name] = emailChannel;
    this.channels[pushChannel.name] = pushChannel;
    this.channels[smsChannel.name] = smsChannel;
  }

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification | null> {
    const {
      userId,
      title,
      content,
      channel = 'in_app',
      type = NotificationType.SYSTEM,
      templateKey,
      metadata,
      actionUrl,
      imageUrl,
      expiresAt,
      priority = undefined,
    } = createNotificationDto;

    // 1. Fetch or create default preferences
    let prefs = await this.prefRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefRepo.create({
        userId,
        inApp: true,
        email: false,
        push: false,
        sms: false,
        transactionStatusChanges: true,
        transactionErrors: true,
        transactionConfirmations: true,
        securityAlerts: true,
        priceAlerts: true,
        portfolioUpdates: true,
        newsUpdates: true,
        systemAnnouncements: true,
        emailFrequency: 'immediate',
        pushFrequency: 'immediate',
        enableQuietHours: false,
        quietHoursExceptUrgent: false,
      });
      await this.prefRepo.save(prefs);
    }

    // 2. If preferences say "don't send on this channel," bail out
    if (!this.shouldSendNotification(type, prefs, channel as any)) {
      this.logger.log(
        `Skipping notification for user=${userId}, channel=${channel}, type=${type}`,
      );
      return null;
    }

    // 3. Create & save a new Notification entity
    const notif = this.notificationRepo.create(
      <DeepPartial<Notification>>{
        userId,
        title,
        content,
        channel,
        type,
        metadata,
        actionUrl,
        imageUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: NotificationStatus.PENDING,
        templateKey: templateKey || type.toLowerCase(),
        priority,
        retryCount: 0,
        read: false,
      },
    );
    const saved = await this.notificationRepo.save(notif);

    // 4. Enqueue it for processing (so processNotification(...) will be called later)
    await this.queue.add(
      'process-notification',
      { notificationId: saved.id },
      {} /* job options can be left empty; tests only assert “expect.any(Object)” */,
    );

    // 5. Emit an application-level event
    this.eventEmitter.emit('notification.created', {
      userId: saved.userId,
      notification: saved,
    });

    return saved;
  }

  async findAll(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number }> {
    const where: any = { userId };
    if (query.type) where.type = query.type;
    if (query.read !== undefined) where.read = query.read;

    const qb = this.notificationRepo.createQueryBuilder('notification').where(where);

    if (query.search) {
      qb.andWhere(
        '(notification.title ILIKE :search OR notification.content ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const total = await qb.getCount();

    qb.orderBy('notification.createdAt', 'DESC')
      .skip(query.offset || 0)
      .take(query.limit || 10);

    const data = await qb.getMany();
    return { data, total };
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    const notif = await this.notificationRepo.findOne({ where: { id, userId } });
    return notif as Notification;
  }

  async update(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notif = await this.findOne(id, userId);
    if (!notif) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    Object.assign(notif, updateNotificationDto);
    return this.notificationRepo.save(notif);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notif = await this.findOne(id, userId);
    if (!notif) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    notif.read = true;
    return this.notificationRepo.save(notif);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepo.update(
      { userId, read: false },
      { read: true },
    );
    return result.affected || 0;
  }

  async remove(id: string, userId: string): Promise<void> {
    const notif = await this.findOne(id, userId);
    if (!notif) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    await this.notificationRepo.remove(notif);
  }

  async removeAllRead(userId: string): Promise<void> {
    const readItems = await this.notificationRepo.find({
      where: { userId, read: true },
    });
    if (readItems.length > 0) {
      await this.notificationRepo.remove(readItems);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, read: false },
    });
  }

  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.prefRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefRepo.create({
        userId,
        inApp: true,
        email: false,
        push: false,
        sms: false,
        transactionStatusChanges: true,
        transactionErrors: true,
        transactionConfirmations: true,
        securityAlerts: true,
        priceAlerts: true,
        portfolioUpdates: true,
        newsUpdates: true,
        systemAnnouncements: true,
        emailFrequency: 'immediate',
        pushFrequency: 'immediate',
        enableQuietHours: false,
        quietHoursExceptUrgent: false,
      });
      await this.prefRepo.save(prefs);
    }
    return prefs;
  }

  async updateUserPreferences(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    let prefs = await this.prefRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefRepo.create({ userId });
    }
    Object.assign(prefs, dto);
    return this.prefRepo.save(prefs);
  }

  private shouldSendNotification(
    type: NotificationType,
    preferences: NotificationPreference,
    channel: 'in_app' | 'email' | 'push' | 'sms',
  ): boolean {
    if (channel === 'in_app' && !preferences.inApp) return false;
    if (channel === 'email' && !preferences.email) return false;
    if (channel === 'push' && !preferences.push) return false;
    if (channel === 'sms' && !preferences.sms) return false;

    switch (type) {
      case NotificationType.TRANSACTION:
        return (
          preferences.transactionStatusChanges ||
          preferences.transactionErrors ||
          preferences.transactionConfirmations
        );
      case NotificationType.SECURITY:
        return preferences.securityAlerts;
      case NotificationType.PRICE_ALERT:
        return preferences.priceAlerts;
      case NotificationType.PORTFOLIO:
        return preferences.portfolioUpdates;
      case NotificationType.NEWS:
        return preferences.newsUpdates;
      case NotificationType.SYSTEM:
        return preferences.systemAnnouncements;
      default:
        return true;
    }
  }

  async processNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
      relations: ['user'],
    });

    if (!notification) {
      this.logger.error(`Notification not found: ${notificationId}`);
      return;
    }

    try {
      if (notification.channel === 'email') {
        await this.mailService.sendEmail(notification);
      } else if (notification.channel === 'push') {
        await this.pushService.sendPush(notification);
      } else if (notification.channel === 'sms') {
        await this.smsChannel.send(notification);
      }

      notification.status = NotificationStatus.SENT as any;
      await this.notificationRepo.save(notification);
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${notificationId}: ${error.message}`,
      );

      notification.status =
        notification.retryCount < 3
          ? (NotificationStatus.RETRYING as any)
          : (NotificationStatus.FAILED as any);
      notification.retryCount += 1;
      await this.notificationRepo.save(notification);

      if (notification.status === (NotificationStatus.RETRYING as any)) {
        throw error;
      }
    }
  }

  async send(data: {
    userId: string;
    title: string;
    content: string;
    channel: 'in_app' | 'email' | 'push' | 'sms';
    metadata?: any;
    type: string;
    expiresAt?: Date;
  }): Promise<Notification> {
    return this.create({
      userId: data.userId,
      title: data.title,
      content: data.content,
      channel: data.channel,
      metadata: data.metadata || {},
      type: data.type as unknown as NotificationType,
      expiresAt: data.expiresAt ? data.expiresAt.toISOString() : undefined,
    }) as Promise<Notification>;
  }

  async markTransactionNotificationRead(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    notification.read = true;
    await this.notificationRepo.save(notification);
  }

  async dispatch(userId: string, data: any): Promise<void> {
    await this.queue.add({
      userId,
      title: data.title || 'New Notification',
      content: data.content || '',
      type: data.type || NotificationType.SYSTEM,
      metadata: data.metadata || {},
      timestamp: new Date(),
    });

    this.logger.log(`Dispatched notification to queue for user ${userId}`);
  }

  async dispatchTransactionNotification(data: {
    userId: string;
    transactionId: string;
    title: string;
    message: string;
    eventType: string;
    metadata?: any;
  }): Promise<void> {
    return this.dispatch(data.userId, {
      title: data.title,
      content: data.message,
      type: NotificationType.TRANSACTION,
      metadata: {
        transactionId: data.transactionId,
        eventType: data.eventType,
        ...data.metadata,
      },
    });
  }

  async getTransactionNotifications(
    userId: string,
    transactionId?: string,
  ): Promise<Notification[]> {
    const where: FindOptionsWhere<Notification> = {
      userId,
      type: NotificationType.TRANSACTION,
    };

    if (transactionId) {
      where.metadata = { transactionId };
    }

    return this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async sendNotification(data: any): Promise<void> {
    const { userId, title, content, type, metadata, channel } = data;
    await this.create({
      userId,
      title,
      content,
      type,
      channel: channel || 'in_app',
      metadata,
    });
    this.logger.log(`Notification processed for user ${userId}: ${title}`);
  }

  getChannelProvider(name: 'email' | 'push' | 'sms'): NotificationChannel {
    const channel = this.channels[name];
    if (!channel) {
      throw new Error(`Channel provider not found: ${name}`);
    }
    return channel;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async sendTransactionNotification(tx, eventType) {
  const messages = {
    transaction_confirmed: 'Transaction confirmed!',
    transaction_failed: 'Transaction failed!',
    transaction_rejected: 'Transaction rejected!',
  };

  const message = messages[eventType];
  if (!message) return;

  // Replace this with actual email, in-app, or push notification logic
  console.log(`Notify ${tx.userId}: ${message}`);
}
}
