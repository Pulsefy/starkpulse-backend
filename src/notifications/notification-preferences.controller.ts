import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences', description: 'Returns the notification preferences for the current user.' })
  @ApiResponse({ status: 200, description: 'Notification preferences retrieved', schema: { example: { userId: 'user-uuid', email: true, push: false, sms: false } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUserPreferences(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserPreferences(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update notification preferences', description: 'Updates the notification preferences for the current user.' })
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
  @ApiResponse({ status: 200, description: 'Notification preferences updated', schema: { example: { userId: 'user-uuid', email: true, push: false, sms: false } } })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateUserPreferences(
    @Request() req,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.updateUserPreferences(userId, updateDto);
  }
}
