import { Plan, Selo } from '../generated/prisma/enums.js';

export interface PlanConfig {
  plan: Plan;
  label: string;
  tagline: string;
  priceMonthly: number;
  selo: Selo;
  planPriority: number;
  rankingWeight: number;
  maxListings: number;
  maxMedia: number;
  aiGenerationsPerMonth: number;
  proposalsPerMonth: number;
  hasPerformanceStats: boolean;
  hasAdvancedInsights: boolean;
  verifiedBadge: boolean;
  highlight?: string;
  benefits: string[];
}

// JSON.stringify(Infinity) serializes to null, which breaks the API response and
// frontend comparisons — use a large finite sentinel instead so it survives JSON.
export const UNLIMITED = 999_999;

/**
 * Catálogo público: só os 3 níveis vendidos hoje. O enum Plan no banco ainda tem
 * BUSINESS por causa de dados de teste antigos e para evitar uma migração arriscada
 * de remoção de valor de enum no Postgres — mas ele não é mais oferecido/vendido.
 * Assinantes legados em BUSINESS são tratados com os benefícios do PREMIUM (ver
 * getPlanConfig).
 */
export const PLAN_CATALOG: Record<Plan, PlanConfig> = {
  GRATIS: {
    plan: 'GRATIS',
    label: 'Grátis',
    tagline: 'Para começar a construir sua presença',
    priceMonthly: 0,
    selo: 'NENHUM',
    planPriority: 0,
    rankingWeight: 0,
    maxListings: 1,
    maxMedia: 3,
    aiGenerationsPerMonth: 3,
    proposalsPerMonth: 5,
    hasPerformanceStats: false,
    hasAdvancedInsights: false,
    verifiedBadge: false,
    benefits: [
      'Perfil profissional completo',
      'Fotos e descrição do seu trabalho',
      'Apareça nas buscas da sua região',
      'Receba avaliações de clientes',
      'Até 5 propostas de oportunidades por mês',
    ],
  },
  PRO: {
    plan: 'PRO',
    label: 'Profissional',
    tagline: 'Para quem quer receber mais oportunidades',
    priceMonthly: 29.9,
    selo: 'PRATA',
    planPriority: 1,
    rankingWeight: 12,
    maxListings: 5,
    maxMedia: 15,
    aiGenerationsPerMonth: 30,
    proposalsPerMonth: 60,
    hasPerformanceStats: true,
    hasAdvancedInsights: false,
    verifiedBadge: false,
    highlight: 'Mais escolhido',
    benefits: [
      'Tudo do plano Grátis',
      'Maior exposição e prioridade nas buscas',
      'Até 60 propostas de oportunidades por mês',
      'Estatísticas de desempenho do perfil',
      'Visualizações do perfil e aparições em buscas',
      'Selo Prata de destaque',
    ],
  },
  BUSINESS: {
    // Legado — não vendido mais. Mapeado para os mesmos benefícios do PREMIUM
    // para não prejudicar quem já assinou este nível em versões anteriores.
    plan: 'BUSINESS',
    label: 'Premium',
    tagline: 'Para profissionais que querem máxima visibilidade',
    priceMonthly: 59.9,
    selo: 'PREMIUM',
    planPriority: 2,
    rankingWeight: 25,
    maxListings: UNLIMITED,
    maxMedia: UNLIMITED,
    aiGenerationsPerMonth: 100,
    proposalsPerMonth: UNLIMITED,
    hasPerformanceStats: true,
    hasAdvancedInsights: true,
    verifiedBadge: true,
    benefits: [
      'Tudo do Profissional',
      'Prioridade máxima nas buscas',
      'Propostas de oportunidades ilimitadas',
      'Insights avançados de desempenho',
      'Selo de prestador verificado',
    ],
  },
  PREMIUM: {
    plan: 'PREMIUM',
    label: 'Premium',
    tagline: 'Para profissionais que querem máxima visibilidade',
    priceMonthly: 59.9,
    selo: 'PREMIUM',
    planPriority: 2,
    rankingWeight: 25,
    maxListings: UNLIMITED,
    maxMedia: UNLIMITED,
    aiGenerationsPerMonth: 100,
    proposalsPerMonth: UNLIMITED,
    hasPerformanceStats: true,
    hasAdvancedInsights: true,
    verifiedBadge: true,
    benefits: [
      'Tudo do Profissional',
      'Prioridade máxima nas buscas',
      'Propostas de oportunidades ilimitadas',
      'Insights avançados de desempenho',
      'Selo de prestador verificado',
    ],
  },
};

/** Planos vendidos hoje, na ordem de exibição da página de preços. */
export const SELLABLE_PLANS: Plan[] = ['GRATIS', 'PRO', 'PREMIUM'];

export function getPlanCatalogForSale(): PlanConfig[] {
  return SELLABLE_PLANS.map((p) => PLAN_CATALOG[p]);
}

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLAN_CATALOG[plan];
}

export const BOOST_CONFIG = {
  label: 'Potencialização de clientes',
  price: 5,
  durationDays: 7,
  description: 'Coloca seu perfil no topo dos recomendados por 7 dias, à frente até de outros planos.',
};

export function currentPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
