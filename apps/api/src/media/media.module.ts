import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [ProvidersModule, AuthModule, SubscriptionsModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
