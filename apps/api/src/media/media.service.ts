import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { CreateMediaDto } from './dto/create-media.dto.js';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async create(userId: string, dto: CreateMediaDto) {
    const provider = await this.providersService.findByUserId(userId);
    const currentCount = await this.prisma.media.count({ where: { providerId: provider.id } });
    await this.subscriptionsService.assertMediaLimit(provider.id, currentCount);
    return this.prisma.media.create({ data: { ...dto, providerId: provider.id } });
  }

  findForProvider(providerId: string) {
    return this.prisma.media.findMany({ where: { providerId }, orderBy: { createdAt: 'desc' } });
  }

  async remove(userId: string, mediaId: string) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId }, include: { provider: true } });
    if (!media) throw new NotFoundException('Mídia não encontrada');
    if (media.provider.userId !== userId) throw new ForbiddenException('Você não é o dono desta mídia');
    return this.prisma.media.delete({ where: { id: mediaId } });
  }
}
