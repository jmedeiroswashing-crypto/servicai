import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../generated/prisma/enums.js';

@Injectable()
export class MarketplaceChatService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async startConversation(buyerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Anúncio não encontrado');
    if (product.sellerId === buyerId) {
      throw new BadRequestException('Você não pode iniciar uma conversa sobre o seu próprio anúncio');
    }

    return this.prisma.marketplaceConversation.upsert({
      where: { productId_buyerId: { productId, buyerId } },
      create: { productId, buyerId, sellerId: product.sellerId },
      update: {},
      include: {
        product: { select: { id: true, title: true, price: true, photoUrls: true, status: true } },
        seller: { select: { name: true, avatarUrl: true } },
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.marketplaceConversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: {
        product: { select: { id: true, title: true, price: true, photoUrls: true, status: true } },
        buyer: { select: { name: true, avatarUrl: true } },
        seller: { select: { name: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const conversation = await this.assertParticipant(userId, conversationId);
    const message = await this.prisma.marketplaceMessage.create({
      data: { conversationId: conversation.id, senderId: userId, content },
    });

    const isSenderBuyer = conversation.buyerId === userId;
    const recipientId = isSenderBuyer ? conversation.sellerId : conversation.buyerId;
    const senderName = isSenderBuyer ? conversation.buyer.name : conversation.seller.name;

    await this.notificationsService.create({
      userId: recipientId,
      type: NotificationType.NOVA_MENSAGEM,
      title: `Nova mensagem de ${senderName} sobre "${conversation.product.title}"`,
      body: content.length > 80 ? `${content.slice(0, 80)}...` : content,
      link: `/marketplace/mensagens?c=${conversation.id}`,
    });

    return message;
  }

  async listMessages(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    return this.prisma.marketplaceMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assertParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.marketplaceConversation.findUnique({
      where: { id: conversationId },
      include: {
        product: { select: { id: true, title: true, price: true, photoUrls: true, status: true } },
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenException('Você não participa desta conversa');
    }
    return conversation;
  }
}
