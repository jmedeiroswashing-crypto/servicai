import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Selo, BookingStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { computeRankingScore, type RankingContext, type RankingInput } from './ranking.js';
import { getEffectivePlan } from '../subscriptions/subscription-state.js';

const ACCEPTED_STATUSES: BookingStatus[] = [
  BookingStatus.ACEITO,
  BookingStatus.EM_ANDAMENTO,
  BookingStatus.CONCLUIDO,
];

type RankableCandidate = {
  id: string;
  plan: import('../generated/prisma/enums.js').Plan;
  boostExpiresAt: Date | null;
  ratingAvg: number;
  servicesDone: number;
  bio: string | null;
  categories: string[];
  mediaCountFallback?: number;
  yearsExperience: number;
  updatedAt: Date;
  city: string;
  specialty: string;
  addressState?: string | null;
  _count?: { reviews?: number; media?: number };
};

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Aplica o algoritmo de ranking de visibilidade a um conjunto de candidatos já
   * carregados do banco (com plano, avaliações e contagens). O plano influencia a
   * posição via `rankingWeight`, mas relevância de busca, localização, nota e
   * atividade continuam pesando — um prestador grátis relevante pode superar um
   * pago irrelevante. Retorna a lista já ordenada da mais para a menos relevante.
   */
  async rankCandidates<T extends RankableCandidate>(candidates: T[], ctx: RankingContext): Promise<T[]> {
    if (candidates.length === 0) return candidates;

    const ids = candidates.map((c) => c.id);
    const bookingGroups = await this.prisma.booking.groupBy({
      by: ['providerId', 'status'],
      where: { providerId: { in: ids } },
      _count: true,
    });
    const bookingStats = new Map<string, { total: number; accepted: number }>();
    for (const g of bookingGroups) {
      const entry = bookingStats.get(g.providerId) ?? { total: 0, accepted: 0 };
      entry.total += g._count;
      if (ACCEPTED_STATUSES.includes(g.status)) entry.accepted += g._count;
      bookingStats.set(g.providerId, entry);
    }

    const scored = candidates.map((c) => {
      const stats = bookingStats.get(c.id) ?? { total: 0, accepted: 0 };
      const input: RankingInput = {
        plan: c.plan,
        boostExpiresAt: c.boostExpiresAt,
        ratingAvg: c.ratingAvg,
        reviewCount: c._count?.reviews ?? 0,
        servicesDone: c.servicesDone,
        bookingsTotal: stats.total,
        bookingsAccepted: stats.accepted,
        bio: c.bio,
        categoriesCount: c.categories.length,
        mediaCount: c._count?.media ?? c.mediaCountFallback ?? 0,
        yearsExperience: c.yearsExperience,
        updatedAt: c.updatedAt,
        city: c.city,
        state: c.addressState ?? null,
        categories: c.categories,
        specialty: c.specialty,
      };
      return { item: c, score: computeRankingScore(input, ctx) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item);
  }

  async trackSearchAppearances(ids: string[]) {
    if (ids.length === 0) return;
    await this.prisma.providerProfile
      .updateMany({ where: { id: { in: ids } }, data: { searchAppearances: { increment: 1 } } })
      .catch(() => undefined);
  }

  async findAll(params: { city?: string; category?: string; skip?: number; take?: number }) {
    const { city, category, skip = 0, take = 20 } = params;
    const candidates = await this.prisma.providerProfile.findMany({
      where: {
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(category ? { categories: { has: category } } : {}),
      },
      include: {
        user: { select: { name: true, avatarUrl: true, addressState: true } },
        media: { take: 6 },
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
        _count: { select: { reviews: true, media: true } },
      },
      take: Math.min(skip + take + 150, 500),
    });

    const withPlan = candidates.map((c) => ({
      ...c,
      plan: c.subscription ? getEffectivePlan(c.subscription) : ('GRATIS' as const),
    }));
    const ranked = await this.rankCandidates(
      withPlan.map((c) => ({ ...c, addressState: c.user.addressState })),
      { categoryQuery: category, city },
    );
    const page = ranked.slice(skip, skip + take);
    await this.trackSearchAppearances(page.map((p) => p.id));
    return page;
  }

  async findOne(id: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
            phone: true,
            verified: true,
            addressStreet: true,
            addressNumber: true,
            addressState: true,
            addressCep: true,
          },
        },
        media: { orderBy: { createdAt: 'desc' } },
        services: { where: { active: true } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!provider) throw new NotFoundException('Prestador não encontrado');

    this.prisma.providerProfile
      .update({ where: { id }, data: { profileViews: { increment: 1 } } })
      .catch(() => undefined);

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

export { computeRankingScore } from './ranking.js';
