import { Module } from '@nestjs/common';
import { MarketplaceChatService } from './marketplace-chat.service.js';
import { MarketplaceChatController } from './marketplace-chat.controller.js';
import { MarketplaceChatGateway } from './marketplace-chat.gateway.js';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [MarketplaceChatController],
  providers: [MarketplaceChatService, MarketplaceChatGateway],
})
export class MarketplaceChatModule {}
