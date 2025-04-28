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
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger"
import type { NotificationsService } from "./notifications.service"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import type { CreateNotificationDto } from "./dto/create-notification.dto"
import type { UpdateNotificationDto } from "./dto/update-notification.dto"
import type { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto"
import type { NotificationQueryDto } from "./dto/notification-query.dto"
import { Notification } from "./entities/notification.entity"
import { NotificationPreference } from "./entities/notification-preference.entity"
import { NotificationType } from "./enums/notificationType.enum"

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The notification has been successfully created.',
    type: Notification
  })
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all notifications for the current user" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all notifications for the current user.",
    type: [Notification],
  })
  async findAll(
    @Request() req,
    @Query() query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number }> {
    const userId = req.user.id
    return this.notificationsService.findAll(userId, query)
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the count of unread notifications.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' }
      }
    }
  })
  async getUnreadCount(@Request() req): Promise<{ count: number }> {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get("types")
  @ApiOperation({ summary: "Get all notification types" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns all notification types.",
    schema: {
      type: "array",
      items: { type: "string" },
    },
  })
  getNotificationTypes(): string[] {
    return Object.values(NotificationType)
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a notification by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the notification.",
    type: Notification,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Notification not found." })
  @ApiParam({ name: "id", description: "Notification ID" })
  async findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    const userId = req.user.id
    const notification = await this.notificationsService.findOne(id, userId)

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`)
    }

    return notification
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a notification" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The notification has been successfully updated.",
    type: Notification,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Notification not found." })
  @ApiParam({ name: "id", description: "Notification ID" })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const userId = req.user.id
    return this.notificationsService.update(id, userId, updateNotificationDto)
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The notification has been successfully marked as read.",
    type: Notification,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Notification not found." })
  @ApiParam({ name: "id", description: "Notification ID" })
  async markAsRead(@Request() req, @Param('id', ParseUUIDPipe) id: string): Promise<Notification> {
    const userId = req.user.id
    return this.notificationsService.markAsRead(id, userId)
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications have been successfully marked as read.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        count: { type: 'number' }
      }
    }
  })
  async markAllAsRead(@Request() req): Promise<{ success: boolean, count: number }> {
    const userId = req.user.id;
    const count = await this.notificationsService.markAllAsRead(userId);
    return { success: true, count };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a notification" })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: "The notification has been successfully deleted." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Notification not found." })
  @ApiParam({ name: "id", description: "Notification ID" })
  async remove(@Request() req, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const userId = req.user.id
    return this.notificationsService.remove(id, userId)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'All read notifications have been successfully deleted.' })
  async removeAllRead(@Request() req): Promise<void> {
    const userId = req.user.id;
    return this.notificationsService.removeAllRead(userId);
  }

  // Notification Preferences
  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the notification preferences.',
    type: NotificationPreference
  })
  async getPreferences(@Request() req): Promise<NotificationPreference> {
    const userId = req.user.id;
    return this.notificationsService.getUserPreferences(userId);
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Update notification preferences" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The notification preferences have been successfully updated.",
    type: NotificationPreference,
  })
  async updatePreferences(
    @Request() req,
    @Body() updatePreferenceDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const userId = req.user.id
    return this.notificationsService.updateUserPreferences(userId, updatePreferenceDto)
  }
}
