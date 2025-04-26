// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './entities/notification.entity';
import { TransactionNotification } from './entities/transaction-notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      TransactionNotification,
      NotificationPreference,
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
  ],
  providers: [NotificationsService, NotificationsGateway],
  controllers: [NotificationPreferencesController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
