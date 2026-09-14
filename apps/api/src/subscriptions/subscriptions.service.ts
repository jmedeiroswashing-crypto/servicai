import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { Plan, SubscriptionStatus, NotificationType } from '../generated/prisma/enums.js';
import { BOOST_CONFIG, getPlanCatalogForSale, getPlanConfig, currentPeriod } from './plans.config.js';
import { getEffectivePlan, isExpired } from './subscription-state.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const BOOST_DURATION_MS = BOOST_CONFIG.durationDays * 24 * 60 * 60 * 1000;
const EXPIRY_WARNING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
    private notificationsService: NotificationsService,
  ) {}

  getCatalog() {
    return getPlanCatalogForSale();
  }

  getBoostInfo() {
    return BOOST_CONFIG;
  }

  /**
   * Sem gateway de pagamento integrado ainda: a compra do impulso é aplicada
   * imediatamente, como os planos. Se já houver um impulso ativo, os 7 dias são
   * somados ao prazo restante em vez de reiniciar do zero.
   */
  async purchaseBoost(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const now = new Date();
    const base = provider.boostExpiresAt && provider.boostExpiresAt > now ? provider.boostExpiresAt : now;
    const boostExpiresAt = new Date(base.getTime() + BOOST_DURATION_MS);

    return this.prisma.providerProfile.update({
      where: { id: provider.id },
      data: { boostExpiresAt },
    });
  }

  /**
   * Ponto único de leitura da assinatura de um prestador. Aplica a expiração de
   * verdade: se o prazo pago já passou, a assinatura vira EXPIRADA e o prestador
   * volta a valer como Grátis (selo e prioridade de ranking inclusos) — a
   * permissão real vem do status, não do que a tela mostrava antes.
   */
  async getOrCreateForProvider(providerId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { providerId } });
    const subscription = existing ?? (await this.prisma.subscription.create({ data: { providerId } }));

    if (subscription.plan !== Plan.GRATIS && isExpired(subscription) && subscription.status !== SubscriptionStatus.EXPIRADA) {
      const expired = await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRADA, cancelAtPeriodEnd: false },
      });
      const freeConfig = getPlanConfig(Plan.GRATIS);
      const oldConfig = getPlanConfig(subscription.plan);
      const [providerRecord] = await Promise.all([
        this.prisma.providerProfile.update({
          where: { id: providerId },
          data: { selo: freeConfig.selo, planPriority: freeConfig.planPriority },
          select: { userId: true },
        }),
      ]);
      await this.notificationsService.create({
        userId: providerRecord.userId,
        type: NotificationType.PLANO_EXPIRADO,
        title: `Seu plano ${oldConfig.label} expirou`,
        body: 'Você voltou para o plano Grátis. Assine novamente para recuperar sua exposição e limites.',
        link: '/precos',
      });
      return expired;
    }

    return subscription;
  }

  async getMine(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const subscription = await this.getOrCreateForProvider(provider.id);
    await this.warnIfExpiringSoon(userId, subscription);
    const effectivePlan = getEffectivePlan(subscription);
    return { ...subscription, effectivePlan, config: getPlanConfig(effectivePlan) };
  }

  private async warnIfExpiringSoon(
    userId: string,
    subscription: { plan: Plan; status: SubscriptionStatus; currentPeriodEnd: Date | null },
  ) {
    if (subscription.plan === Plan.GRATIS || !subscription.currentPeriodEnd) return;
    if (subscription.status !== SubscriptionStatus.ATIVA && subscription.status !== SubscriptionStatus.CANCELAMENTO_SOLICITADO) return;

    const msUntilExpiry = subscription.currentPeriodEnd.getTime() - Date.now();
    if (msUntilExpiry <= 0 || msUntilExpiry > EXPIRY_WARNING_WINDOW_MS) return;

    const config = getPlanConfig(subscription.plan);
    const daysLeft = Math.max(1, Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000)));
    await this.notificationsService.createIfNotRecentlyNotified({
      userId,
      type: NotificationType.PLANO_EXPIRANDO,
      title: `Seu plano ${config.label} expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
      body:
        subscription.status === SubscriptionStatus.CANCELAMENTO_SOLICITADO
          ? 'O cancelamento já foi solicitado — você mantém os benefícios até essa data.'
          : 'Renove para não perder sua exposição e seus limites de propostas.',
      link: '/painel/plano',
    });
  }

  /**
   * Sem gateway de pagamento integrado ainda: a troca de plano é aplicada imediatamente.
   * Quando um provedor de pagamento (Stripe/Pagar.me) for integrado, este método deve ser
   * chamado a partir do webhook de confirmação de pagamento, não diretamente pelo cliente.
   */
  async changePlan(userId: string, plan: Plan) {
    const provider = await this.providersService.findByUserId(userId);
    const subscription = await this.getOrCreateForProvider(provider.id);
    const config = getPlanConfig(plan);

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        status: SubscriptionStatus.ATIVA,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: plan === Plan.GRATIS ? null : new Date(Date.now() + THIRTY_DAYS_MS),
      },
    });

    await this.prisma.providerProfile.update({
      where: { id: provider.id },
      data: { selo: config.selo, planPriority: config.planPriority },
    });

    return { ...updated, config };
  }

  /**
   * Cancelamento "soft", como a maioria dos SaaS: o prestador mantém os
   * benefícios até o fim do período já pago, e só então volta para o Grátis
   * (via a expiração aplicada em getOrCreateForProvider). Diferente de
   * `changePlan(GRATIS)`, que derruba o plano na hora.
   */
  async requestCancellation(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const subscription = await this.getOrCreateForProvider(provider.id);

    if (subscription.plan === Plan.GRATIS) {
      throw new ForbiddenException('Você já está no plano Grátis');
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELAMENTO_SOLICITADO, cancelAtPeriodEnd: true },
    });
  }

  async cancel(userId: string) {
    return this.changePlan(userId, Plan.GRATIS);
  }

  async assertListingLimit(providerId: string, currentCount: number) {
    const subscription = await this.getOrCreateForProvider(providerId);
    const config = getPlanConfig(getEffectivePlan(subscription));
    if (currentCount >= config.maxListings) {
      throw new ForbiddenException(
        `Seu plano ${config.label} permite até ${config.maxListings} anúncio(s) ativo(s). Faça upgrade para publicar mais.`,
      );
    }
  }

  async assertMediaLimit(providerId: string, currentCount: number) {
    const subscription = await this.getOrCreateForProvider(providerId);
    const config = getPlanConfig(getEffectivePlan(subscription));
    if (currentCount >= config.maxMedia) {
      throw new ForbiddenException(
        `Seu plano ${config.label} permite até ${config.maxMedia} itens de mídia. Faça upgrade para adicionar mais.`,
      );
    }
  }

  async consumeAiUsage(providerId: string) {
    const subscription = await this.getOrCreateForProvider(providerId);
    const config = getPlanConfig(getEffectivePlan(subscription));
    const period = currentPeriod();

    const inCurrentPeriod = subscription.aiUsagePeriod === period;
    const usedSoFar = inCurrentPeriod ? subscription.aiUsageCount : 0;

    if (usedSoFar >= config.aiGenerationsPerMonth) {
      throw new ForbiddenException(
        `Você atingiu o limite de ${config.aiGenerationsPerMonth} usos de IA do plano ${config.label} neste mês. Faça upgrade para continuar.`,
      );
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { aiUsagePeriod: period, aiUsageCount: usedSoFar + 1 },
    });
  }

  /**
   * A principal alavanca comercial: quantas propostas de oportunidade o
   * prestador pode enviar por mês. É isso que vende "mais chances de fechar
   * negócio", não uma funcionalidade travada.
   */
  async assertProposalLimit(providerId: string) {
    const subscription = await this.getOrCreateForProvider(providerId);
    const config = getPlanConfig(getEffectivePlan(subscription));
    const period = currentPeriod();
    const usedSoFar = subscription.proposalsUsedPeriod === period ? subscription.proposalsUsedCount : 0;

    if (usedSoFar >= config.proposalsPerMonth) {
      throw new ForbiddenException(
        `Você usou suas ${config.proposalsPerMonth} propostas do plano ${config.label} neste mês. Assine um plano superior para enviar mais propostas e não perder oportunidades.`,
      );
    }
    return { usedSoFar, limit: config.proposalsPerMonth, period };
  }

  async consumeProposal(providerId: string) {
    const { period, usedSoFar } = await this.assertProposalLimit(providerId);
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { providerId } });
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { proposalsUsedPeriod: period, proposalsUsedCount: usedSoFar + 1 },
    });
  }

  async findProviderIdByUserId(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');
    return provider.id;
  }

  /**
   * Dados para a área "Meu Plano": desempenho real (visualizações, aparições em
   * busca, contatos) e o consumo do mês frente ao limite do plano. Sem gráfico
   * histórico por enquanto — isso exigiria uma tabela de eventos por dia, que
   * ainda não existe (registrado como próximo passo).
   */
  async getPerformance(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const subscription = await this.getOrCreateForProvider(provider.id);
    const config = getPlanConfig(getEffectivePlan(subscription));
    const period = currentPeriod();

    const [conversationsCount, bookingsCount] = await Promise.all([
      this.prisma.conversation.count({ where: { providerId: provider.id } }),
      this.prisma.booking.count({ where: { providerId: provider.id } }),
    ]);

    const proposalsUsed = subscription.proposalsUsedPeriod === period ? subscription.proposalsUsedCount : 0;

    return {
      profileViews: provider.profileViews,
      searchAppearances: provider.searchAppearances,
      contactsCount: conversationsCount + bookingsCount,
      proposalsUsed,
      proposalsLimit: config.proposalsPerMonth,
      hasPerformanceStats: config.hasPerformanceStats,
      hasAdvancedInsights: config.hasAdvancedInsights,
    };
  }

  /**
   * "Prospecção de possíveis clientes" — exclusiva do plano Premium (mesmo flag
   * hasAdvancedInsights dos outros recursos avançados). Por privacidade/LGPD, a
   * lista NÃO é de quem só visualizou o perfil (isso seria usar o contato do
   * cliente para uma finalidade que ele nunca autorizou) — é de quem favoritou
   * o prestador, um sinal real de interesse e uma ação que o próprio cliente
   * escolheu fazer.
   */
  async getProspecting(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const subscription = await this.getOrCreateForProvider(provider.id);
    const config = getPlanConfig(getEffectivePlan(subscription));

    if (!config.hasAdvancedInsights) {
      throw new ForbiddenException(
        'A prospecção de possíveis clientes é exclusiva do plano Premium. Assine o Premium para ver quem demonstrou interesse no seu perfil.',
      );
    }

    const favorites = await this.prisma.favorite.findMany({
      where: { providerId: provider.id },
      include: { client: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return favorites
      .filter((f) => !!f.client.phone)
      .map((f) => ({ name: f.client.name, phone: f.client.phone, favoritedAt: f.createdAt }));
  }

  /**
   * Métricas agregadas para administração (só ADMIN). MRR é estimado a partir
   * dos assinantes pagos ativos — sem histórico de eventos, não dá para mostrar
   * evolução ao longo do tempo ainda; isso fica para quando existir uma tabela
   * de auditoria de mudanças de plano.
   */
  async getAdminOverview() {
    const [totalProviders, subscriptions] = await Promise.all([
      this.prisma.providerProfile.count(),
      this.prisma.subscription.findMany(),
    ]);

    const byPlan: Record<string, number> = { GRATIS: 0, PRO: 0, PREMIUM: 0 };
    let mrr = 0;
    let cancelamentosSolicitados = 0;

    for (const sub of subscriptions) {
      const effective = getEffectivePlan(sub);
      const key = effective === 'BUSINESS' ? 'PREMIUM' : effective;
      byPlan[key] = (byPlan[key] ?? 0) + 1;
      if (effective !== Plan.GRATIS) mrr += getPlanConfig(effective).priceMonthly;
      if (sub.status === SubscriptionStatus.CANCELAMENTO_SOLICITADO) cancelamentosSolicitados++;
    }

    const paidCount = totalProviders - byPlan.GRATIS;
    const conversionRate = totalProviders > 0 ? paidCount / totalProviders : 0;

    return {
      totalProviders,
      byPlan,
      mrr: Math.round(mrr * 100) / 100,
      conversionRate: Math.round(conversionRate * 1000) / 1000,
      cancelamentosSolicitados,
    };
  }
}
