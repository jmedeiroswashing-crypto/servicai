import { Controller, Get, Query } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService, withEffectiveAvailability } from '../providers/providers.service.js';
import { getEffectivePlan } from '../subscriptions/subscription-state.js';

@Controller('search')
export class SearchController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  @Get()
  async search(@Query('q') query: string, @Query('availableNow') availableNow?: string) {
    if (!query || query.trim().length === 0) {
      return { intent: null, providers: [] };
    }

    const intent = await this.aiService.parseSearchIntent(query);

    const candidates = await this.prisma.providerProfile.findMany({
      where: {
        user: { deletedAt: null },
        OR: [
          { specialty: { contains: intent.category, mode: 'insensitive' } },
          { categories: { has: intent.category } },
          { specialty: { contains: query, mode: 'insensitive' } },
        ],
        ...(intent.location ? { city: { contains: intent.location, mode: 'insensitive' } } : {}),
        ...(availableNow === 'true' ? { availableNow: true, availableUntil: { gt: new Date() } } : {}),
      },
      include: {
        user: { select: { name: true, avatarUrl: true, addressState: true } },
        media: { take: 3 },
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
        _count: { select: { reviews: true, media: true } },
      },
      take: 100,
    });

    const withPlan = candidates.map((c) => ({
      ...withEffectiveAvailability(c),
      plan: c.subscription ? getEffectivePlan(c.subscription) : ('GRATIS' as const),
    }));
    const ranked = await this.providersService.rankCandidates(
      withPlan.map((c) => ({ ...c, addressState: c.user.addressState })),
      { categoryQuery: intent.category, city: intent.location },
    );
    const page = ranked.slice(0, 30);
    await this.providersService.trackSearchAppearances(page.map((p) => p.id));

    return { intent, providers: page };
  }
}
