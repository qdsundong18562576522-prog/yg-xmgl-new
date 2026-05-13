import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.service.findByUser(user.userId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: any) {
    const count = await this.service.unreadCount(user.userId);
    return { count };
  }

  @Post(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.markRead(id, user.userId);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: any) {
    return this.service.markAllRead(user.userId);
  }
}
