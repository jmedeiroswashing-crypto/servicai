import { Plan, Selo } from '../generated/prisma/enums.js';

export interface PlanConfig {
  plan: Plan;
  label: string;
  priceMonthly: number;
  selo: Selo;
  planPriority: number;
  maxListings: number;
  maxMedia: number;
  aiGenerationsPerMonth: number;
  features: string[];
}

// JSON.stringify(Infinity) serializes to null, which breaks the API response and
// frontend comparisons — use a large finite sentinel instead so it survives JSON.
export const UNLIMITED = 999_999;

export const PLAN_CATALOG: Record<Plan, PlanConfig> = {
  GRATIS: {
    plan: 'GRATIS',
    label: 'Grátis',
    priceMonthly: 0,
    selo: 'NENHUM',
    planPriority: 0,
    maxListings: 1,
    maxMedia: 3,
    aiGenerationsPerMonth: 3,
    features: ['1 anúncio de serviço', 'Até 3 fotos na galeria', '3 usos de IA por mês', 'Sem destaque na busca'],
  },
  PRO: {
    plan: 'PRO',
    label: 'Pro',
    priceMonthly: 49.9,
    selo: 'PRATA',
    planPriority: 1,
    maxListings: 5,
    maxMedia: 15,
    aiGenerationsPerMonth: 30,
    features: ['Até 5 anúncios de serviço', 'Até 15 fotos/vídeos', 'Selo Prata', '30 usos de IA por mês', 'Destaque leve na busca'],
  },
  BUSINESS: {
    plan: 'BUSINESS',
    label: 'Business',
    priceMonthly: 129.9,
    selo: 'OURO',
    planPriority: 2,
    maxListings: UNLIMITED,
    maxMedia: 50,
    aiGenerationsPerMonth: 100,
    features: ['Anúncios ilimitados', 'Até 50 fotos/vídeos', 'Selo Ouro', '100 usos de IA por mês', 'Destaque alto na busca', 'Métricas de desempenho'],
  },
  PREMIUM: {
    plan: 'PREMIUM',
    label: 'Premium',
    priceMonthly: 349.9,
    selo: 'PREMIUM',
    planPriority: 3,
    maxListings: UNLIMITED,
    maxMedia: UNLIMITED,
    aiGenerationsPerMonth: UNLIMITED,
    features: ['Tudo do Business', 'Mídia ilimitada', 'Selo Premium', 'IA sem limite de uso', 'Prioridade máxima na busca', 'Gerente de conta dedicado'],
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLAN_CATALOG[plan];
}

export function currentPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
