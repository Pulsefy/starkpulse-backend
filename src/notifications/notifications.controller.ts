import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import type { NotificationQueryDto } from './dto/notification-query.dto';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationType } from './enums/notificationType.enum';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new notification',
    description: 'Creates a notification for a user or system event.',
  })
  @ApiBody({
    description: 'Notification creation payload',
    type: CreateNotificationDto,
    examples: {
      example1: {
        summary: 'Basic notification',
        value: {
          type: 'TRANSACTION',
          title: 'Transaction Confirmed',
          message: 'Your transaction was confirmed.',
          userId: 'user-uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The notification has been successfully created.',
    type: Notification,
    examples: {
      example1: {
        value: {
          id: 'notif-uuid',
          type: 'TRANSACTION',
          title: 'Transaction Confirmed',
          message: 'Your transaction was confirmed.',
          userId: 'user-uuid',
          createdAt: '2023-08-15T10:23:45.123Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all notifications for the current user',
    description:
      'Returns all notifications for the current user, with optional filters.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all notifications for the current user.',
    type: [Notification],
    examples: {
      example1: {
        value: [
          {
            id: 'notif-uuid',
            type: 'TRANSACTION',
            title: 'Transaction Confirmed',
            message: 'Your transaction was confirmed.',
            userId: 'user-uuid',
            createdAt: '2023-08-15T10:23:45.123Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(
    @Request() req,
    @Query() query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number }> {
    const userId = req.user.id;
    return this.notificationsService.findAll(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get count of unread notifications',
    description: 'Returns the count of unread notifications for the current user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the count of unread notifications.',
    schema: { example: { count: 3 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUnreadCount(@Request() req): Promise<{ count: number }> {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get('types')
  @ApiOperation({
    summary: 'Get all notification types',
    description: 'Returns all possible notification types.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all notification types.',
    schema: { example: ['TRANSACTION', 'NEWS', 'SYSTEM'] },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationTypes(): Promise<string[]> {
    return Object.values(NotificationType);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a notification by ID',
    description: 'Returns a specific notification by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the notification.',
    type: Notification,
    examples: {
      example1: {
        value: {
          id: 'notif-uuid',
          type: 'TRANSACTION',
          title: 'Transaction Confirmed',
          message: 'Your transaction was confirmed.',
          userId: 'user-uuid',
          createdAt: '2023-08-15T10:23:45.123Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Notification> {
    const userId = req.user.id;
    const notification = await this.notificationsService.findOne(id, userId);

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a notification',
    description: 'Updates a notification by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiBody({
    description: 'Notification update payload',
    type: UpdateNotificationDto,
    examples: {
      example1: {
        summary: 'Mark as read',
        value: { read: true },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The notification has been successfully updated.',
    type: Notification,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found.',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const userId = req.user.id;
    return this.notificationsService.update(id, userId, updateNotificationDto);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark a notification as read',
    description: 'Marks a specific notification as read.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The notification has been successfully marked as read.',
    type: Notification,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async markAsRead(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Notification> {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all notifications as read for the current user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications have been successfully marked as read.',
    schema: { example: { success: true, count: 5 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async markAllAsRead(
    @Request() req,
  ): Promise<{ success: boolean; count: number }> {
    const userId = req.user.id;
    const count = await this.notificationsService.markAllAsRead(userId);
    return { success: true, count };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Deletes a specific notification by its ID.',
  })
  @ApiParam({ name: 'id', description: 'Notification ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The notification has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notification not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async remove(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const userId = req.user.id;
    return this.notificationsService.remove(id, userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete all read notifications',
    description: 'Deletes all read notifications for the current user.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'All read notifications have been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async removeAllRead(@Request() req): Promise<void> {
    const userId = req.user.id;
    return this.notificationsService.removeAllRead(userId);
  }

  // Notification Preferences
  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences for the current user',
    description: 'Returns the notification preferences for the current user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the notification preferences.',
    type: NotificationPreference,
    examples: {
      example1: {
        value: {
          userId: 'user-uuid',
          email: true,
          push: false,
          sms: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getPreferences(@Request() req): Promise<NotificationPreference> {
    const userId = req.user.id;
    return this.notificationsService.getUserPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Updates the notification preferences for the current user.',
  })
  @ApiBody({
    description: 'Notification preferences update payload',
    type: UpdateNotificationPreferenceDto,
    examples: {
      example1: {
        summary: 'Enable email notifications',
        value: { email: true, push: false, sms: false },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The notification preferences have been successfully updated.',
    type: NotificationPreference,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updatePreferences(
    @Request() req,
    @Body() updatePreferenceDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const userId = req.user.id;
    return this.notificationsService.updateUserPreferences(
      userId,
      updatePreferenceDto,
    );
  }
}
