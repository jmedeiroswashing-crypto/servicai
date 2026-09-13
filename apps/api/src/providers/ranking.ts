import { getPlanConfig } from '../subscriptions/plans.config.js';
import type { Plan } from '../generated/prisma/enums.js';

/**
 * Ranking de relevância de busca. O plano influencia a posição, mas não decide
 * sozinho: um prestador grátis muito bem avaliado e ativo pode superar um
 * assinante pago irrelevante para a busca. Isso mantém a experiência do
 * cliente justa (ele é quem decide se a plataforma continua confiável).
 *
 * Pesos (soma máxima ~130 antes do impulso avulso):
 *  - Relevância de categoria: até 40
 *  - Localização (cidade/estado): até 20
 *  - Nota média: até 15
 *  - Volume de avaliações: até 10
 *  - Taxa de resposta (aceite de solicitações): até 10
 *  - Atividade recente: até 5
 *  - Completude do perfil: até 10
 *  - Plano contratado: até 25 (config.rankingWeight)
 *  - Impulso avulso ativo: +200 (fura qualquer ordenação orgânica, por tempo limitado)
 */

export interface RankingInput {
  plan: Plan;
  boostExpiresAt: Date | null;
  ratingAvg: number;
  reviewCount: number;
  servicesDone: number;
  bookingsTotal: number;
  bookingsAccepted: number;
  bio: string | null;
  categoriesCount: number;
  mediaCount: number;
  yearsExperience: number;
  updatedAt: Date;
  city: string;
  state: string | null;
  categories: string[];
  specialty: string;
}

export interface RankingContext {
  categoryQuery?: string | null;
  city?: string | null;
  state?: string | null;
}

function categoryRelevance(input: RankingInput, ctx: RankingContext): number {
  if (!ctx.categoryQuery) return 20; // sem busca específica: relevância neutra
  const query = ctx.categoryQuery.toLowerCase();
  const exact = input.categories.some((c) => c.toLowerCase() === query) || input.specialty.toLowerCase() === query;
  if (exact) return 40;
  const partial =
    input.categories.some((c) => c.toLowerCase().includes(query) || query.includes(c.toLowerCase())) ||
    input.specialty.toLowerCase().includes(query);
  return partial ? 22 : 0;
}

function locationScore(input: RankingInput, ctx: RankingContext): number {
  if (ctx.city && input.city.toLowerCase() === ctx.city.toLowerCase()) return 20;
  if (ctx.state && input.state && input.state === ctx.state) return 10;
  return ctx.city || ctx.state ? 0 : 8; // sem filtro de local: não penaliza nem favorece
}

function responseRate(input: RankingInput): number {
  if (input.bookingsTotal === 0) return 6; // sem histórico ainda: nota neutra, não penaliza quem começou agora
  return (input.bookingsAccepted / input.bookingsTotal) * 10;
}

function recentActivityScore(input: RankingInput): number {
  const daysSinceUpdate = (Date.now() - input.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate <= 30) return 5;
  if (daysSinceUpdate <= 90) return 2.5;
  return 0;
}

function profileCompletenessScore(input: RankingInput): number {
  let filled = 0;
  const total = 5;
  if (input.bio && input.bio.length > 20) filled++;
  if (input.mediaCount > 0) filled++;
  if (input.categoriesCount > 0) filled++;
  if (input.yearsExperience > 0) filled++;
  if (input.servicesDone > 0) filled++;
  return (filled / total) * 10;
}

export function computeRankingScore(input: RankingInput, ctx: RankingContext = {}): number {
  const isBoosted = !!input.boostExpiresAt && input.boostExpiresAt > new Date();
  const config = getPlanConfig(input.plan);

  const score =
    categoryRelevance(input, ctx) +
    locationScore(input, ctx) +
    (input.ratingAvg / 5) * 15 +
    Math.min(input.reviewCount / 20, 1) * 10 +
    responseRate(input) +
    recentActivityScore(input) +
    profileCompletenessScore(input) +
    config.rankingWeight +
    (isBoosted ? 200 : 0);

  return Math.round(score * 100) / 100;
}
