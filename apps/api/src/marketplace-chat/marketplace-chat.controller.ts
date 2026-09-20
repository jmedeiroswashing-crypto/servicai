import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { MarketplaceChatService } from './marketplace-chat.service.js';
import { StartMarketplaceConversationDto } from './dto/start-conversation.dto.js';
import { SendMarketplaceMessageDto } from './dto/send-message.dto.js';

@Controller('marketplace-chat')
@UseGuards(JwtAuthGuard)
export class MarketplaceChatController {
  constructor(private marketplaceChatService: MarketplaceChatService) {}

  @Post('conversations')
  startConversation(@CurrentUser() user: AuthUser, @Body() dto: StartMarketplaceConversationDto) {
    return this.marketplaceChatService.startConversation(user.userId, dto.productId);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthUser) {
    return this.marketplaceChatService.listMine(user.userId);
  }

  @Get('conversations/:id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketplaceChatService.listMessages(user.userId, id);
  }

  @Post('conversations/:id/messages')
  sendMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMarketplaceMessageDto) {
    return this.marketplaceChatService.sendMessage(user.userId, id, dto.content);
  }
}
