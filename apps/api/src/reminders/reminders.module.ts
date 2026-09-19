import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service.js';
import { RemindersController } from './reminders.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
