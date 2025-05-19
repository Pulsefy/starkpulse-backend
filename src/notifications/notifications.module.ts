import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationProcessor } from './notification.processor';
import { MailService } from './mail.service';
import { PushService } from './push.service';
import { DispatcherService } from './dispatcher.service';

import { Notification } from './entities/notification.entity';
import { TransactionNotification } from './entities/transaction-notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationTemplate } from './entities/notification-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      TransactionNotification,
      NotificationPreference,
      NotificationTemplate, // This was duplicated in the imports
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    EventEmitterModule.forRoot(),
    BullModule.registerQueue({
      name: 'notification-queue',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationProcessor,
    MailService,
    PushService,
    DispatcherService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
