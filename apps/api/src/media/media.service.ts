import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { CreateMediaDto } from './dto/create-media.dto.js';
import { UpdateMediaDto } from './dto/update-media.dto.js';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  private async assertServiceOwnership(providerId: string, serviceId?: string) {
    if (!serviceId) return;
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.providerId !== providerId) {
      throw new BadRequestException('Serviço inválido para este prestador');
    }
  }

  async create(userId: string, dto: CreateMediaDto) {
    const provider = await this.providersService.findByUserId(userId);
    const currentCount = await this.prisma.media.count({ where: { providerId: provider.id } });
    await this.subscriptionsService.assertMediaLimit(provider.id, currentCount);
    await this.assertServiceOwnership(provider.id, dto.serviceId);
    return this.prisma.media.create({ data: { ...dto, providerId: provider.id } });
  }

  findForProvider(providerId: string) {
    return this.prisma.media.findMany({ where: { providerId }, orderBy: { createdAt: 'desc' } });
  }

  async update(userId: string, mediaId: string, dto: UpdateMediaDto) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId }, include: { provider: true } });
    if (!media) throw new NotFoundException('Mídia não encontrada');
    if (media.provider.userId !== userId) throw new ForbiddenException('Você não é o dono desta mídia');
    await this.assertServiceOwnership(media.providerId, dto.serviceId);
    return this.prisma.media.update({ where: { id: mediaId }, data: dto });
  }

  async remove(userId: string, mediaId: string) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId }, include: { provider: true } });
    if (!media) throw new NotFoundException('Mídia não encontrada');
    if (media.provider.userId !== userId) throw new ForbiddenException('Você não é o dono desta mídia');
    return this.prisma.media.delete({ where: { id: mediaId } });
  }
}
