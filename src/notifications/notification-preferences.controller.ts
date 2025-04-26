import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUserPreferences(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.getUserPreferences(userId);
  }

  @Put()
  async updateUserPreferences(
    @Request() req,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.updateUserPreferences(userId, updateDto);
  }
}
