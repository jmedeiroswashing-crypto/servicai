import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { StartConversationDto } from './dto/start-conversation.dto.js';
import { StartConversationWithClientDto } from './dto/start-conversation-with-client.dto.js';
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

  @Post('conversations/with-client')
  @UseGuards(RolesGuard)
  @Roles(Role.PRESTADOR)
  startConversationAsProvider(@CurrentUser() user: AuthUser, @Body() dto: StartConversationWithClientDto) {
    return this.chatService.startConversationAsProvider(user.userId, dto.clientId);
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
