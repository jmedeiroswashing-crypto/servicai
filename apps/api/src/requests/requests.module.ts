import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service.js';
import { RequestsController } from './requests.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [AuthModule, SubscriptionsModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
