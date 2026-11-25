import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { LeadsController } from './leads.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [AuthModule, ProvidersModule, SubscriptionsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
