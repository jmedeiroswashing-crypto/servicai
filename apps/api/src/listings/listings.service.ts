import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  async create(userId: string, dto: CreateListingDto) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.service.create({
      data: { ...dto, providerId: provider.id },
    });
  }

  findAll(params: { category?: string; skip?: number; take?: number }) {
    const { category, skip = 0, take = 20 } = params;
    return this.prisma.service.findMany({
      where: { active: true, ...(category ? { category } : {}) },
      include: { provider: { include: { user: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async findOne(id: string) {
    const listing = await this.prisma.service.findUnique({
      where: { id },
      include: { provider: { include: { user: { select: { name: true, avatarUrl: true } } } } },
    });
    if (!listing) throw new NotFoundException('Serviço não encontrado');
    return listing;
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    return this.prisma.service.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, listingId: string) {
    const listing = await this.prisma.service.findUnique({
      where: { id: listingId },
      include: { provider: true },
    });
    if (!listing) throw new NotFoundException('Serviço não encontrado');
    if (listing.provider.userId !== userId) throw new ForbiddenException('Você não é o dono deste serviço');
    return listing;
  }
}
