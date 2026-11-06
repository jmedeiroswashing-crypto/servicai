import { Controller, Get, Query } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TAXONOMY } from '../categories/taxonomy.js';
import { PUBLIC_PROVIDER_INCLUDE, ProvidersService, withEffectiveAvailability } from '../providers/providers.service.js';
import { publicProviderWhere } from '../providers/public-visibility.js';
import { getEffectivePlan } from '../subscriptions/subscription-state.js';

/** A busca por uma categoria inteira, como "Beleza", encontra todas as subcategorias dela. */
function categoryLabelsMatching(term: string): string[] {
  const normalized = term.trim().toLocaleLowerCase('pt-BR');
  const category = TAXONOMY.find((c) => c.label.toLocaleLowerCase('pt-BR') === normalized);
  if (category) return category.subcategories.map((s) => s.label);
  return TAXONOMY.flatMap((c) => c.subcategories)
    .filter((s) => s.label.toLocaleLowerCase('pt-BR') === normalized)
    .map((s) => s.label);
}

@Controller('search')
export class SearchController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  @Get()
  async search(
    @Query('q') query: string,
    @Query('availableNow') availableNow?: string,
    @Query('city') city?: string,
  ) {
    if (!query || query.trim().length === 0) {
      return { intent: null, providers: [] };
    }

    const intent = await this.aiService.parseSearchIntent(query);
    // O local escrito na frase vale mais que a cidade selecionada no header.
    const location = intent.location ?? city;

    const candidates = await this.prisma.providerProfile.findMany({
      where: {
        ...publicProviderWhere(),
        AND: [
          {
            OR: [
              { specialty: { contains: intent.category, mode: 'insensitive' } },
              { categories: { has: intent.category } },
              { categories: { hasSome: categoryLabelsMatching(intent.category) } },
              { specialty: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
        ...(location ? { city: { contains: location, mode: 'insensitive' } } : {}),
        ...(availableNow === 'true' ? { availableNow: true, availableUntil: { gt: new Date() } } : {}),
      },
      include: PUBLIC_PROVIDER_INCLUDE,
      take: 100,
    });

    const withPlan = candidates.map((c) => ({
      ...withEffectiveAvailability(c),
      plan: c.subscription ? getEffectivePlan(c.subscription) : ('GRATIS' as const),
    }));
    const ranked = await this.providersService.rankCandidates(
      withPlan.map((c) => ({ ...c, addressState: c.user.addressState })),
      { categoryQuery: intent.category, city: location },
    );
    const page = ranked.slice(0, 30);
    await this.providersService.trackSearchAppearances(page.map((p) => p.id));

    return { intent, providers: await this.providersService.withCardData(page) };
  }
}
