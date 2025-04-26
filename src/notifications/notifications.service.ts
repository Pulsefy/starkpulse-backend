import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { TransactionNotification } from './entities/transaction-notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { CreateTransactionNotificationDto } from './dto/create-transaction-notification.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(TransactionNotification)
    private readonly transactionNotificationRepo: Repository<TransactionNotification>,
    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async dispatch(
    userId: string,
    payload: {
      title: string;
      message: string;
      metadata?: any;
    },
  ) {
    const prefs = await this.getUserPreferences(userId);

    const methods = [
      {
        enabled: prefs?.inApp,
        type: 'in_app' as const,
        handler: async () => {
          // Emit socket event
          this.eventEmitter.emit('notification.created', {
            userId,
            title: payload.title,
            message: payload.message,
            type: 'in_app',
          });
        },
      },
      {
        enabled: prefs?.email,
        type: 'email' as const,
        handler: async () => {
          // Send email implementation
          this.logger.log(`Sending email notification to user ${userId}`);
          // Implementation of email sending logic
        },
      },
      {
        enabled: prefs?.push,
        type: 'push' as const,
        handler: async () => {
          // Push notification implementation
          this.logger.log(`Sending push notification to user ${userId}`);
          // Implementation of push notification logic
        },
      },
    ];

    for (const method of methods) {
      if (method.enabled) {
        try {
          await method.handler();
          await this.notificationRepo.save({
            user: { id: userId } as any,
            title: payload.title,
            message: payload.message,
            metadata: payload.metadata,
            channel: method.type,
            read: false,
            userId: userId,
          });
        } catch (err) {
          this.logger.error(
            `Failed ${method.type} notification for user ${userId}:`,
            err,
          );
        }
      }
    }
  }

  async dispatchTransactionNotification(dto: CreateTransactionNotificationDto) {
    const userId = dto.userId;
    const prefs = await this.getUserPreferences(userId);

    // Check if user wants this type of transaction notification
    let isEnabled = true;
    if (dto.eventType === 'status_change') {
      isEnabled = prefs?.transactionStatusChanges ?? true;
    } else if (dto.eventType === 'error') {
      isEnabled = prefs?.transactionErrors ?? true;
    } else if (dto.eventType === 'confirmation') {
      isEnabled = prefs?.transactionConfirmations ?? true;
    }

    if (!isEnabled) {
      this.logger.log(
        `User ${userId} has disabled ${dto.eventType} notifications`,
      );
      return;
    }

    const methods = [
      {
        enabled: prefs?.inApp,
        type: 'in_app' as const,
        handler: async () => {
          // Emit socket event for in-app notification
          this.eventEmitter.emit('transaction.notification', {
            userId,
            transactionId: dto.transactionId,
            title: dto.title,
            message: dto.message,
            eventType: dto.eventType,
          });
        },
      },
      {
        enabled: prefs?.email,
        type: 'email' as const,
        handler: async () => {
          // Send email implementation
          this.logger.log(
            `Sending transaction email notification to user ${userId}`,
          );
          // Implementation of email sending logic
        },
      },
      {
        enabled: prefs?.push,
        type: 'push' as const,
        handler: async () => {
          // Push notification implementation
          this.logger.log(
            `Sending transaction push notification to user ${userId}`,
          );
          // Implementation of push notification logic
        },
      },
    ];

    for (const method of methods) {
      if (method.enabled) {
        try {
          await method.handler();
          await this.transactionNotificationRepo.save({
            user: { id: userId } as any,
            transaction: { id: dto.transactionId } as any,
            title: dto.title,
            message: dto.message,
            metadata: dto.metadata,
            channel: method.type,
            eventType: dto.eventType,
            read: false,
            userId: userId,
            transactionId: dto.transactionId,
          });
        } catch (err) {
          this.logger.error(
            `Failed ${method.type} transaction notification for user ${userId}:`,
            err,
          );
          // Implement retry logic or queue mechanism here
        }
      }
    }
  }

  async getNotifications(userId: string) {
    return await this.notificationRepo.find({
      where: {
        userId: userId,
      },
      order: {
        createdAt: 'DESC' as const,
      },
    });
  }

  async getTransactionNotifications(userId: string, transactionId?: string) {
    const query = this.transactionNotificationRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (transactionId) {
      query.andWhere('notification.transactionId = :transactionId', {
        transactionId,
      });
    }

    return query.orderBy('notification.createdAt', 'DESC').getMany();
  }

  async markRead(notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      notification.read = true;
      return this.notificationRepo.save(notification);
    }
    throw new Error('Notification not found');
  }

  async markTransactionNotificationRead(notificationId: string) {
    const notification = await this.transactionNotificationRepo.findOne({
      where: { id: notificationId },
    });

    if (notification) {
      notification.read = true;
      return this.transactionNotificationRepo.save(notification);
    }
    throw new Error('Transaction notification not found');
  }

  async getUserPreferences(userId: string) {
    let prefs = await this.prefRepo.findOne({
      where: { userId },
    });

    // Create default preferences if none exist
    if (!prefs) {
      prefs = await this.prefRepo.save({
        user: { id: userId } as any,
        userId,
        inApp: true,
        email: false,
        push: false,
        transactionStatusChanges: true,
        transactionErrors: true,
        transactionConfirmations: true,
      });
    }

    return prefs;
  }

  async updateUserPreferences(
    userId: string,
    updateDto: UpdateNotificationPreferenceDto,
  ) {
    let prefs = await this.getUserPreferences(userId);

    // Update with new values
    Object.assign(prefs, updateDto);

    return this.prefRepo.save(prefs);
  }
}
