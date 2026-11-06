import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Selo, BookingStatus, BusinessMode } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { computeRankingScore, type RankingContext, type RankingInput } from './ranking.js';
import { getEffectivePlan } from '../subscriptions/subscription-state.js';
import { validateBusinessHours } from './business-hours.js';
import { publicProviderWhere, refreshProfileComplete } from './public-visibility.js';
import { normalizeCityName } from '../common/city-name.js';
import type { Prisma } from '../generated/prisma/client.js';

/** Dados que a vitrine e a busca precisam carregar de cada prestador. */
export const PUBLIC_PROVIDER_INCLUDE = {
  user: { select: { name: true, avatarUrl: true, addressState: true, identityStatus: true } },
  media: { take: 6 },
  services: { where: { active: true }, select: { priceMin: true } },
  subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
  _count: { select: { reviews: true, media: true } },
} satisfies Prisma.ProviderProfileInclude;

/** Abaixo disso a nota ainda não diz muito, e o prestador não disputa "Melhor avaliados". */
const MIN_REVIEWS_FOR_RATING = 3;

const ACCEPTED_STATUSES: BookingStatus[] = [
  BookingStatus.ACEITO,
  BookingStatus.EM_ANDAMENTO,
  BookingStatus.CONCLUIDO,
];

const AVAILABILITY_WINDOW_HOURS = 4;

/**
 * "Disponível agora" nunca é lido cru do banco: sempre passa por aqui, que
 * confere se a janela já expirou. Isso garante que a informação mostrada é
 * sempre real, mesmo entre uma execução e outra do job de limpeza — o
 * prestador nunca aparece "disponível" horas depois de esquecer de desligar.
 */
export function withEffectiveAvailability<T extends { availableNow: boolean; availableUntil: Date | null }>(provider: T): T {
  const isActive = provider.availableNow && !!provider.availableUntil && provider.availableUntil.getTime() > Date.now();
  return { ...provider, availableNow: isActive };
}

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

  async findAll(params: { city?: string; category?: string; skip?: number; take?: number; availableNow?: boolean }) {
    const { city, category, skip = 0, take = 20, availableNow } = params;
    const candidates = await this.prisma.providerProfile.findMany({
      where: {
        ...publicProviderWhere(),
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(category ? { categories: { has: category } } : {}),
        ...(availableNow ? { availableNow: true, availableUntil: { gt: new Date() } } : {}),
      },
      include: PUBLIC_PROVIDER_INCLUDE,
      take: Math.min(skip + take + 150, 500),
    });

    const withPlan = candidates.map((c) => ({
      ...withEffectiveAvailability(c),
      plan: c.subscription ? getEffectivePlan(c.subscription) : ('GRATIS' as const),
    }));
    const ranked = await this.rankCandidates(
      withPlan.map((c) => ({ ...c, addressState: c.user.addressState })),
      { categoryQuery: category, city },
    );
    const page = ranked.slice(skip, skip + take);
    await this.trackSearchAppearances(page.map((p) => p.id));
    return this.withCardData(page);
  }

  /**
   * Vitrine da home. A ordem não considera plano nem impulso pago: primeiro quem
   * tem nota com avaliações suficientes, depois quem responde mais rápido.
   * Distância fica de fora porque o banco ainda não guarda coordenadas.
   */
  async findShowcase(params: { city?: string; take?: number }) {
    const take = Math.min(params.take ?? 8, 24);
    const candidates = await this.prisma.providerProfile.findMany({
      where: {
        ...publicProviderWhere(),
        ...(params.city ? { city: { equals: params.city, mode: 'insensitive' } } : {}),
      },
      include: PUBLIC_PROVIDER_INCLUDE,
      take: 100,
    });
    const decorated = await this.withCardData(candidates.map((c) => withEffectiveAvailability(c)));
    const ratingOf = (p: (typeof decorated)[number]) => (p.reviewCount >= MIN_REVIEWS_FOR_RATING ? p.ratingAvg : -1);
    const responseOf = (p: (typeof decorated)[number]) => p.responseMinutes ?? Number.POSITIVE_INFINITY;
    return decorated
      .sort((a, b) => ratingOf(b) - ratingOf(a) || responseOf(a) - responseOf(b))
      .slice(0, take);
  }

  /** Acrescenta ao prestador o que o card público mostra, calculado de dados reais. */
  async withCardData<
    T extends {
      id: string;
      userId: string;
      services?: { priceMin: number | null }[];
      _count?: { reviews?: number };
    },
  >(providers: T[]) {
    const responseMinutes = await this.averageResponseMinutes(providers);
    return providers.map((provider) => {
      const prices = (provider.services ?? []).map((s) => s.priceMin).filter((p): p is number => p != null && p > 0);
      return {
        ...provider,
        reviewCount: provider._count?.reviews ?? 0,
        responseMinutes: responseMinutes.get(provider.id) ?? null,
        priceFrom: prices.length > 0 ? Math.min(...prices) : null,
      };
    });
  }

  /** Média entre a primeira mensagem do cliente e a primeira resposta do prestador. */
  private async averageResponseMinutes(providers: { id: string; userId: string }[]) {
    const result = new Map<string, number>();
    if (providers.length === 0) return result;

    const userIdByProvider = new Map(providers.map((p) => [p.id, p.userId]));
    const conversations = await this.prisma.conversation.findMany({
      where: { providerId: { in: providers.map((p) => p.id) } },
      select: {
        providerId: true,
        clientId: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 20, select: { senderId: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const samples = new Map<string, number[]>();
    for (const conversation of conversations) {
      const firstClient = conversation.messages.find((m) => m.senderId === conversation.clientId);
      if (!firstClient) continue;
      const providerUserId = userIdByProvider.get(conversation.providerId);
      const reply = conversation.messages.find((m) => m.senderId === providerUserId && m.createdAt > firstClient.createdAt);
      if (!reply) continue;
      const list = samples.get(conversation.providerId) ?? [];
      list.push((reply.createdAt.getTime() - firstClient.createdAt.getTime()) / 60_000);
      samples.set(conversation.providerId, list);
    }

    for (const [providerId, minutes] of samples) {
      result.set(providerId, Math.max(1, Math.round(minutes.reduce((sum, m) => sum + m, 0) / minutes.length)));
    }
    return result;
  }

  /**
   * Consulta completa do perfil (usada tanto no perfil público quanto no "meu
   * perfil"). Corrige um bug real: a busca de avaliações não incluía o cliente,
   * então o nome de quem avaliou nunca aparecia (sempre caía no fallback
   * "Cliente" no frontend).
   */
  private async loadRichProfile(id: string) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
            phone: true,
            verified: true,
            identityStatus: true,
            addressStreet: true,
            addressNumber: true,
            addressState: true,
            addressCep: true,
          },
        },
        media: { orderBy: { createdAt: 'desc' } },
        services: { where: { active: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { client: { select: { name: true, avatarUrl: true } } },
        },
        _count: { select: { reviews: true } },
      },
    });
    if (!provider) throw new NotFoundException('Prestador não encontrado');

    const respondsWithinHour = await this.respondsWithinHour(provider.id, provider.userId);
    const { _count, ...rest } = provider;
    return { ...withEffectiveAvailability(rest), reviewCount: _count.reviews, respondsWithinHour };
  }

  async findOne(id: string) {
    const provider = await this.loadRichProfile(id);
    if (provider.isTest) throw new NotFoundException('Prestador não encontrado');

    this.prisma.providerProfile
      .update({ where: { id }, data: { profileViews: { increment: 1 } } })
      .catch(() => undefined);

    return provider;
  }

  /**
   * Versão do perfil completo para o próprio prestador ("meu perfil") — mesma
   * consulta rica do perfil público, mas sem contar como visualização (não faz
   * sentido inflar as próprias métricas de quem viu o perfil).
   */
  async findMyRichProfile(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');
    return this.loadRichProfile(provider.id);
  }

  /**
   * Selo "Responde em até 1 hora" — calculado a partir do histórico real de
   * mensagens (tempo entre a primeira mensagem do cliente em cada conversa e a
   * primeira resposta do prestador), nunca um valor fixo/mockado. Sem histórico
   * suficiente, retorna null e o selo simplesmente não aparece — não inventamos
   * uma promessa que o prestador ainda não comprovou.
   */
  private async respondsWithinHour(providerId: string, providerUserId: string): Promise<boolean | null> {
    const conversations = await this.prisma.conversation.findMany({
      where: { providerId },
      select: {
        clientId: true,
        messages: { orderBy: { createdAt: 'asc' }, select: { senderId: true, createdAt: true } },
      },
      take: 30,
    });

    const responseTimesMs: number[] = [];
    for (const conv of conversations) {
      const firstClientMsg = conv.messages.find((m) => m.senderId === conv.clientId);
      if (!firstClientMsg) continue;
      const firstProviderReply = conv.messages.find(
        (m) => m.senderId === providerUserId && m.createdAt > firstClientMsg.createdAt,
      );
      if (!firstProviderReply) continue;
      responseTimesMs.push(firstProviderReply.createdAt.getTime() - firstClientMsg.createdAt.getTime());
    }

    if (responseTimesMs.length === 0) return null;
    const avgMs = responseTimesMs.reduce((sum, ms) => sum + ms, 0) / responseTimesMs.length;
    return avgMs <= 60 * 60 * 1000;
  }

  async findByUserId(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');
    return withEffectiveAvailability(provider);
  }

  /**
   * Liga/desliga "disponível agora" por uma janela de tempo curta (não fica
   * disponível pra sempre por esquecimento) — o job periódico em
   * RemindersService limpa em massa quem passou da janela, e toda leitura
   * também confere a expiração na hora via withEffectiveAvailability.
   */
  async setAvailability(userId: string, available: boolean) {
    const provider = await this.findByUserId(userId);
    return this.prisma.providerProfile.update({
      where: { id: provider.id },
      data: available
        ? { availableNow: true, availableUntil: new Date(Date.now() + AVAILABILITY_WINDOW_HOURS * 60 * 60 * 1000) }
        : { availableNow: false, availableUntil: null },
    });
  }

  async update(userId: string, dto: UpdateProviderDto) {
    const provider = await this.findByUserId(userId);
    const data: UpdateProviderDto =
      dto.businessHours !== undefined ? { ...dto, businessHours: validateBusinessHours(dto.businessHours) } : { ...dto };
    if (data.city) data.city = normalizeCityName(data.city);
    const updated = await this.prisma.providerProfile.update({
      where: { id: provider.id },
      data: data as never,
    });
    await refreshProfileComplete(this.prisma, userId);
    return updated;
  }

  /**
   * Resposta única pra pergunta de intenção no primeiro acesso: "gestão
   * apenas" ou "gestão + contratação". Quem escolhe gestão apenas some da
   * busca pública (ver findAll) e para de receber alerta de nova
   * oportunidade — a pessoa não quer ser encontrada por cliente.
   */
  async setBusinessMode(userId: string, businessMode: BusinessMode) {
    const provider = await this.findByUserId(userId);
    return this.prisma.providerProfile.update({
      where: { id: provider.id },
      data: { businessMode },
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
