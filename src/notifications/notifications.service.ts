import { Injectable, Logger, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import {  Repository, type FindOptionsWhere, MoreThan } from "typeorm"
import type { EventEmitter2 } from "@nestjs/event-emitter"
import { Notification } from "./entities/notification.entity"
import { NotificationPreference } from "./entities/notification-preference.entity"
import type { CreateNotificationDto } from "./dto/create-notification.dto"
import type { UpdateNotificationDto } from "./dto/update-notification.dto"
import type { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto"
import type { NotificationQueryDto } from "./dto/notification-query.dto"
import type { MailService } from "./mail.service"
import type { PushService } from "./push.service"
import { InjectQueue } from "@nestjs/bull"
import type { Queue } from "bull"
import { NotificationType } from "./enums/notificationType.enum"
import { NotificationStatus } from "./enums/notificationStatus.enum"
import { NotificationTemplate } from "./entities/notification-template.entity"

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,

    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: NotificationTemplate,

    private readonly eventEmitter: EventEmitter2,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
    
    @InjectQueue('notification-queue') 
    private readonly queue: Queue,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const { userId, ...notificationData } = createNotificationDto

    // Check user preferences
    const preferences = await this.getUserPreferences(userId)

    // Determine if notification should be sent based on preferences
    if (
      !this.shouldSendNotification(
        notificationData.type as NotificationType,
        preferences,
        notificationData.channel as "in_app" | "email" | "push",
      )
    ) {
      this.logger.log(`Notification not sent due to user preferences: ${userId}, type: ${notificationData.type}`)
      return null
    }

    // Create notification
    const notification = this.notificationRepo.create({
      ...notificationData,
      userId,
      expiresAt: notificationData.expiresAt ? new Date(notificationData.expiresAt) : null,
    })

    const savedNotification = await this.notificationRepo.save(notification)

    // Emit event for real-time updates
    this.eventEmitter.emit("notification.created", {
      userId,
      notification: savedNotification,
    })

    // Queue notification for delivery if it's email or push
    if (notification.channel === "email" || notification.channel === "push") {
      await this.queue.add(
        "process-notification",
        { notificationId: savedNotification.id },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        },
      )
    }

    return savedNotification
  }

  async findAll(userId: string, query: NotificationQueryDto): Promise<{ data: Notification[]; total: number }> {
    const where: FindOptionsWhere<Notification> = { userId }

    // Apply filters
    if (query.type) {
      where.type = query.type
    }

    if (query.read !== undefined) {
      where.read = query.read
    }

    if (query.priority) {
      where.priority = query.priority
    }

    // Apply search if provided
    const queryBuilder = this.notificationRepo.createQueryBuilder("notification").where(where)

    if (query.search) {
      queryBuilder.andWhere("(notification.title ILIKE :search OR notification.content ILIKE :search)", {
        search: `%${query.search}%`,
      })
    }

    // Get total count
    const total = await queryBuilder.getCount()

    // Apply pagination
    queryBuilder
      .orderBy("notification.createdAt", "DESC")
      .skip(query.offset || 0)
      .take(query.limit || 10)

    // Execute query
    const data = await queryBuilder.getMany()

    return { data, total }
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    return this.notificationRepo.findOne({
      where: { id, userId },
    })
  }

  async update(id: string, userId: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.findOne(id, userId)

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`)
    }

    // Update notification
    Object.assign(notification, updateNotificationDto)

    return this.notificationRepo.save(notification)
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(id, userId)

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`)
    }

    notification.read = true
    return this.notificationRepo.save(notification)
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepo.update({ userId, read: false }, { read: true })

    return result.affected || 0
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.findOne(id, userId)

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`)
    }

    await this.notificationRepo.remove(notification)
  }

  async removeAllRead(userId: string): Promise<void> {
    const readNotifications = await this.notificationRepo.find({
      where: { userId, read: true },
    })

    if (readNotifications.length > 0) {
      await this.notificationRepo.remove(readNotifications)
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, read: false },
    })
  }

  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.prefRepo.findOne({
      where: { userId },
    })

    // Create default preferences if none exist
    if (!prefs) {
      prefs = this.prefRepo.create({
        userId,
        inApp: true,
        email: false,
        push: false,
        transactionStatusChanges: true,
        transactionErrors: true,
        transactionConfirmations: true,
        securityAlerts: true,
        priceAlerts: true,
        portfolioUpdates: true,
        newsUpdates: true,
        systemAnnouncements: true,
      })

      await this.prefRepo.save(prefs)
    }

    return prefs
  }

  async updateUserPreferences(
    userId: string,
    updateDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const prefs = await this.getUserPreferences(userId)

    // Update with new values
    Object.assign(prefs, updateDto)

    return this.prefRepo.save(prefs)
  }

  private shouldSendNotification(
    type: NotificationType,
    preferences: NotificationPreference,
    channel: "in_app" | "email" | "push",
  ): boolean {
    // Check if the channel is enabled
    if (channel === "in_app" && !preferences.inApp) return false
    if (channel === "email" && !preferences.email) return false
    if (channel === "push" && !preferences.push) return false

    // Check if the notification type is enabled
    switch (type) {
      case NotificationType.TRANSACTION:
        return (
          preferences.transactionStatusChanges || preferences.transactionErrors || preferences.transactionConfirmations
        )
      case NotificationType.SECURITY:
        return preferences.securityAlerts
      case NotificationType.PRICE_ALERT:
        return preferences.priceAlerts
      case NotificationType.PORTFOLIO:
        return preferences.portfolioUpdates
      case NotificationType.NEWS:
        return preferences.newsUpdates
      case NotificationType.SYSTEM:
        return preferences.systemAnnouncements
      default:
        return true
    }
  }

  async processNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
      relations: ["user"],
    })

    if (!notification) {
      this.logger.error(`Notification not found: ${notificationId}`)
      return
    }

    try {
      if (notification.channel === "email") {
        await this.mailService.sendEmail(notification)
      } else if (notification.channel === "push") {
        await this.pushService.sendPush(notification)
      }

      notification.status = NotificationStatus.SENT
      await this.notificationRepo.save(notification)
    } catch (error) {
      this.logger.error(`Failed to process notification ${notificationId}: ${error.message}`)

      notification.status = notification.retryCount < 3 ? NotificationStatus.RETRYING : NotificationStatus.FAILED
      notification.retryCount += 1
      await this.notificationRepo.save(notification)

      if (notification.status === NotificationStatus.RETRYING) {
        throw error // Let Bull retry
      }
    }
  }

  //THIS FN SENDS A NOTIFICATION
public async send({
  userId,
  title,
  content,
  channel,
  metadata,
  type,
}: {
  userId: string;
  title: string;
  content: string;
  channel: 'in_app' | 'email' | 'push';
  metadata?: Record<string, any>;
  type: 'transaction' | 'price_alert' | 'news_update';
}): Promise<Notification> {
  // Fetch the appropriate template using getRepository
  const templateRepo = Repository(NotificationTemplate);

  const templates = await templateRepo.find({
    where: { type },
  });

  const template = templates.length > 0 ? templates[0] : null;

  // Handle case where template is not found
  const finalContent = template ? template.template.replace('{content}', content) : content;

  const notification = this.notificationRepo.create({
    userId,
    title: template?.subject || title, // Default to provided title
    content: finalContent,
    channel,
    metadata,
  });

  return this.notificationRepo.save(notification);
}


public async sendDailyDigest(userId: string): Promise<void> {
  // Find all notifications sent today that are not grouped
  const notifications = await this.notificationRepo.find({
    where: { userId, createdAt: MoreThan(new Date(new Date().setHours(0, 0, 0, 0))) },
  });

  // Group notifications and create a digest
  const groupedNotifications = notifications.reduce((acc, notification) => {
    if (!acc[notification.channel]) {
      acc[notification.channel] = [];
    }
    acc[notification.channel].push(notification);
    return acc;
  }, {});
}

}
