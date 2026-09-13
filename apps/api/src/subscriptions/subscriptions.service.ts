import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { Plan, SubscriptionStatus } from '../generated/prisma/enums.js';
import { BOOST_CONFIG, PLAN_CATALOG, currentPeriod, getPlanConfig } from './plans.config.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const BOOST_DURATION_MS = BOOST_CONFIG.durationDays * 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  getCatalog() {
    return Object.values(PLAN_CATALOG);
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

  async getOrCreateForProvider(providerId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { providerId } });
    if (existing) return existing;
    return this.prisma.subscription.create({ data: { providerId } });
  }

  async getMine(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const subscription = await this.getOrCreateForProvider(provider.id);
    return { ...subscription, config: getPlanConfig(subscription.plan) };
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

  async cancel(userId: string) {
    return this.changePlan(userId, Plan.GRATIS);
  }

  async assertListingLimit(providerId: string, currentCount: number) {
    const subscription = await this.getOrCreateForProvider(providerId);
    const config = getPlanConfig(subscription.plan);
    if (currentCount >= config.maxListings) {
      throw new ForbiddenException(
        `Seu plano ${config.label} permite até ${config.maxListings} anúncio(s) ativo(s). Faça upgrade para publicar mais.`,
      );
    }
  }

  async assertMediaLimit(providerId: string, currentCount: number) {
    const subscription = await this.getOrCreateForProvider(providerId);
    const config = getPlanConfig(subscription.plan);
    if (currentCount >= config.maxMedia) {
      throw new ForbiddenException(
        `Seu plano ${config.label} permite até ${config.maxMedia} itens de mídia. Faça upgrade para adicionar mais.`,
      );
    }
  }

  async consumeAiUsage(providerId: string) {
    const subscription = await this.getOrCreateForProvider(providerId);
    const config = getPlanConfig(subscription.plan);
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

  async findProviderIdByUserId(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');
    return provider.id;
  }
}
