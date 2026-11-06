import { Injectable } from '@nestjs/common';
import { RequestStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicProviderWhere } from '../providers/public-visibility.js';

/** Abaixo disso a informação não é representativa: a tela usa a lista fixa ou esconde a seção. */
const MIN_REAL_ITEMS = 3;

function cityFilter(city?: string) {
  return city ? { city: { equals: city, mode: 'insensitive' as const } } : {};
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /** Taxonomia completa com quantos prestadores públicos atendem cada item. */
  async list(city?: string) {
    const [categories, providers] = await Promise.all([
      this.prisma.serviceCategory.findMany({
        orderBy: { position: 'asc' },
        include: { subcategories: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.providerProfile.findMany({
        where: { ...publicProviderWhere(), ...cityFilter(city) },
        select: { categories: true },
      }),
    ]);

    return categories.map((category) => {
      const labels = new Set(category.subcategories.map((s) => s.label));
      return {
        slug: category.slug,
        label: category.label,
        providerCount: providers.filter((p) => p.categories.some((c) => labels.has(c))).length,
        subcategories: category.subcategories.map((s) => ({
          slug: s.slug,
          label: s.label,
          providerCount: providers.filter((p) => p.categories.includes(s.label)).length,
        })),
      };
    });
  }

  /** Serviços mais pedidos de verdade na cidade; vazio enquanto não há dados suficientes. */
  async popular(city?: string) {
    const groups = await this.prisma.serviceRequest.groupBy({
      by: ['category'],
      where: cityFilter(city),
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
      take: 8,
    });
    return groups.length >= MIN_REAL_ITEMS ? groups.map((g) => g.category) : [];
  }

  /** Só categoria, cidade e data: nada que identifique quem pediu. */
  async recentRequests(city?: string) {
    const requests = await this.prisma.serviceRequest.findMany({
      where: { status: RequestStatus.ABERTA, ...cityFilter(city) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, category: true, city: true, createdAt: true },
      take: 6,
    });
    return requests.length >= MIN_REAL_ITEMS ? requests : [];
  }
}
