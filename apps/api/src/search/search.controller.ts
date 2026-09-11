import { Controller, Get, Query } from '@nestjs/common';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('search')
export class SearchController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async search(@Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return { intent: null, providers: [] };
    }

    const intent = await this.aiService.parseSearchIntent(query);

    const providers = await this.prisma.providerProfile.findMany({
      where: {
        OR: [
          { specialty: { contains: intent.category, mode: 'insensitive' } },
          { categories: { has: intent.category } },
          { specialty: { contains: query, mode: 'insensitive' } },
        ],
        ...(intent.location ? { city: { contains: intent.location, mode: 'insensitive' } } : {}),
      },
      include: { user: { select: { name: true, avatarUrl: true } }, media: { take: 3 } },
      orderBy: [{ scoreIA: 'desc' }, { ratingAvg: 'desc' }],
      take: 30,
    });

    return { intent, providers };
  }
}
