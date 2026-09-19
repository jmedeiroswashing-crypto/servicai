import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { NotificationsService } from './notifications.service.js';
import { PushSubscribeDto, PushUnsubscribeDto } from './dto/push-subscribe.dto.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('push-subscribe')
  pushSubscribe(@CurrentUser() user: AuthUser, @Body() dto: PushSubscribeDto) {
    return this.notificationsService.subscribeToPush(user.userId, dto);
  }

  @Post('push-unsubscribe')
  pushUnsubscribe(@CurrentUser() user: AuthUser, @Body() dto: PushUnsubscribeDto) {
    return this.notificationsService.unsubscribeFromPush(user.userId, dto.endpoint);
  }

  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listMine(user.userId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.notificationsService.unreadCount(user.userId);
    return { count };
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.userId);
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user.userId, id);
  }
}
