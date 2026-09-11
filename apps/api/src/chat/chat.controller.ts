import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { Role } from '../generated/prisma/enums.js';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('conversations')
  startConversation(@CurrentUser() user: AuthUser, @Body() dto: StartConversationDto) {
    return this.chatService.startConversation(user.userId, dto.providerId);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthUser) {
    return user.role === Role.PRESTADOR
      ? this.chatService.listMineAsProvider(user.userId)
      : this.chatService.listMineAsClient(user.userId);
  }

  @Get('conversations/:id/messages')
  listMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.listMessages(user.userId, id);
  }

  @Post('conversations/:id/messages')
  sendMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(user.userId, id, dto.content, dto.type);
  }
}
