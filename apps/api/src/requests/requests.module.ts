import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service.js';
import { RequestsController } from './requests.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AuthModule, SubscriptionsModule, NotificationsModule, AiModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
