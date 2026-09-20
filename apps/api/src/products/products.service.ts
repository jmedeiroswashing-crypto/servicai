import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductStatus } from '../generated/prisma/enums.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(sellerId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        sellerId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        category: dto.category,
        condition: dto.condition,
        city: dto.city,
        state: dto.state,
        photoUrls: dto.photoUrls ?? [],
      },
    });
  }

  /**
   * Mural público — igual em espírito ao mural de oportunidades: qualquer
   * pessoa vê os anúncios ativos, filtrando por categoria/cidade/texto. Contas
   * desativadas (soft delete) somem daqui, mesmo padrão já usado em
   * providers/search.
   */
  async findAll(params: { category?: string; city?: string; q?: string; skip?: number; take?: number }) {
    const { category, city, q, skip = 0, take = 24 } = params;
    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.DISPONIVEL,
        seller: { deletedAt: null },
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      include: { seller: { select: { name: true, avatarUrl: true, verified: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: { select: { name: true, avatarUrl: true, verified: true, city: true } } },
    });
    if (!product) throw new NotFoundException('Anúncio não encontrado');
    return product;
  }

  findMine(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const product = await this.assertOwnership(userId, id);
    return this.prisma.product.update({ where: { id: product.id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const product = await this.assertOwnership(userId, id);
    return this.prisma.product.delete({ where: { id: product.id } });
  }

  private async assertOwnership(userId: string, id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Anúncio não encontrado');
    if (product.sellerId !== userId) throw new ForbiddenException('Você não é o dono deste anúncio');
    return product;
  }

  async favorite(userId: string, productId: string) {
    await this.findOne(productId);
    return this.prisma.productFavorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  unfavorite(userId: string, productId: string) {
    return this.prisma.productFavorite.deleteMany({ where: { userId, productId } });
  }

  findFavorites(userId: string) {
    return this.prisma.productFavorite.findMany({
      where: { userId },
      include: { product: { include: { seller: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
