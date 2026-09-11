import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
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
    return this.prisma.message.create({
      data: { conversationId: conversation.id, senderId: userId, content, type },
    });
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
      include: { provider: true },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    const isClient = conversation.clientId === userId;
    const isProvider = conversation.provider.userId === userId;
    if (!isClient && !isProvider) throw new ForbiddenException('Você não participa desta conversa');
    return conversation;
  }
}
