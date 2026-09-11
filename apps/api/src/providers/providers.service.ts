import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Selo } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { city?: string; category?: string; skip?: number; take?: number }) {
    const { city, category, skip = 0, take = 20 } = params;
    return this.prisma.providerProfile.findMany({
      where: {
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(category ? { categories: { has: category } } : {}),
      },
      include: { user: { select: { name: true, avatarUrl: true } }, media: { take: 6 } },
      orderBy: [{ scoreIA: 'desc' }, { ratingAvg: 'desc' }],
      skip,
      take,
    });
  }

  async findOne(id: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, avatarUrl: true, phone: true, verified: true } },
        media: { orderBy: { createdAt: 'desc' } },
        services: { where: { active: true } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!provider) throw new NotFoundException('Prestador não encontrado');
    return provider;
  }

  async findByUserId(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');
    return provider;
  }

  async update(userId: string, dto: UpdateProviderDto) {
    const provider = await this.findByUserId(userId);
    return this.prisma.providerProfile.update({
      where: { id: provider.id },
      data: dto as never,
    });
  }

  async assertOwnership(userId: string, providerId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Prestador não encontrado');
    if (provider.userId !== userId) throw new ForbiddenException('Você não é o dono deste perfil');
    return provider;
  }

  /**
   * Score ServiçAi: combina nota média das avaliações multi-critério com sinais de
   * confiabilidade (volume de serviços, verificação) em um score de 0 a 100.
   */
  async recalculateScore(providerId: string) {
    const reviews = await this.prisma.review.findMany({ where: { providerId } });
    const provider = await this.prisma.providerProfile.findUniqueOrThrow({ where: { id: providerId } });

    if (reviews.length === 0) return provider;

    const avg = (key: 'pontualidade' | 'qualidade' | 'preco' | 'atendimento' | 'rating') =>
      reviews.reduce((sum, r) => sum + r[key], 0) / reviews.length;

    const ratingAvg = avg('rating');
    const criteriaAvg = (avg('pontualidade') + avg('qualidade') + avg('preco') + avg('atendimento')) / 4;

    const volumeBoost = Math.min(reviews.length / 50, 1) * 10;
    const verifiedBoost = provider.selo !== Selo.NENHUM ? 5 : 0;

    const scoreIA = Math.min(100, Math.round(((ratingAvg + criteriaAvg) / 2) * 18 + volumeBoost + verifiedBoost));

    return this.prisma.providerProfile.update({
      where: { id: providerId },
      data: { ratingAvg, scoreIA, servicesDone: reviews.length },
    });
  }

  async favorite(clientId: string, providerId: string) {
    await this.findOne(providerId);
    return this.prisma.favorite.upsert({
      where: { clientId_providerId: { clientId, providerId } },
      create: { clientId, providerId },
      update: {},
    });
  }

  async unfavorite(clientId: string, providerId: string) {
    return this.prisma.favorite.deleteMany({ where: { clientId, providerId } });
  }

  findFavorites(clientId: string) {
    return this.prisma.favorite.findMany({
      where: { clientId },
      include: { provider: { include: { user: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
