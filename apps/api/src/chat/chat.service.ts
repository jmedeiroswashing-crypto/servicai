import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../generated/prisma/enums.js';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
    private notificationsService: NotificationsService,
  ) {}

  async startConversation(clientId: string, providerId: string) {
    await this.providersService.findOne(providerId);
    return this.prisma.conversation.upsert({
      where: { clientId_providerId: { clientId, providerId } },
      create: { clientId, providerId },
      update: {},
      include: { provider: { include: { user: { select: { name: true, avatarUrl: true } } } } },
    });
  }

  async listMineAsClient(clientId: string) {
    return this.prisma.conversation.findMany({
      where: { clientId },
      include: {
        provider: { include: { user: { select: { name: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMineAsProvider(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.conversation.findMany({
      where: { providerId: provider.id },
      include: {
        client: { select: { name: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendMessage(userId: string, conversationId: string, content: string, type = 'text') {
    const conversation = await this.assertParticipant(userId, conversationId);
    const message = await this.prisma.message.create({
      data: { conversationId: conversation.id, senderId: userId, content, type },
    });

    const isSenderClient = conversation.clientId === userId;
    const recipientId = isSenderClient ? conversation.provider.userId : conversation.clientId;
    const senderName = isSenderClient ? conversation.client.name : conversation.provider.user.name;

    await this.notificationsService.create({
      userId: recipientId,
      type: NotificationType.NOVA_MENSAGEM,
      title: `Nova mensagem de ${senderName}`,
      body: content.length > 80 ? `${content.slice(0, 80)}...` : content,
      link: `/mensagens?c=${conversation.id}`,
    });

    return message;
  }

  async listMessages(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        provider: { include: { user: { select: { name: true } } } },
        client: { select: { name: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    const isClient = conversation.clientId === userId;
    const isProvider = conversation.provider.userId === userId;
    if (!isClient && !isProvider) throw new ForbiddenException('Você não participa desta conversa');
    return conversation;
  }
}
