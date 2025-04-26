import { Controller, Put, Body, Request, Get, Patch, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationsService,
    @InjectRepository(NotificationPreference)
    private readonly prefRepo: Repository<NotificationPreference>,
  ) {}

  @Put('preferences')
  async updatePreferences(
    @Request() req,
    @Body() dto: Partial<NotificationPreference>
  ) {
    const user = req.user;

    const existing = await this.prefRepo.findOne({ where: { user: { id: user.id } } });
    if (existing) {
      Object.assign(existing, dto);
      return this.prefRepo.save(existing);
    }

    const newPref = this.prefRepo.create({ ...dto, user });
    return this.prefRepo.save(newPref);
  }

  @Get()
  async getNotifications(@Request() req) {
    return this.notificationService.getNotifications(req.user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }
}
