import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BookingStatus, DealStatus, NotificationType } from '../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import { DealFiltersDto } from './dto/deal-filters.dto.js';

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateDealDto) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Escolha uma data e horário futuros para a vaga');
    }
    if (dto.dealPrice > dto.originalPrice) {
      throw new BadRequestException('O preço da vaga não pode ser maior que o preço original');
    }

    return this.prisma.lastMinuteDeal.create({
      data: {
        providerId: provider.id,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        city: dto.city ?? provider.city,
        state: dto.state,
        originalPrice: dto.originalPrice,
        dealPrice: dto.dealPrice,
        scheduledAt,
      },
    });
  }

  /**
   * Mural público das vagas de última hora — mesma lógica de filtro por
   * categoria/cidade da busca normal, só que aqui é o prestador quem publica
   * e qualquer cliente pode ver e reservar (ao contrário do mural de
   * oportunidades, aqui não há dado sensível de cliente a proteger).
   */
  async listPublic(filters: DealFiltersDto) {
    const deals = await this.prisma.lastMinuteDeal.findMany({
      where: {
        status: DealStatus.ATIVA,
        scheduledAt: { gt: new Date() },
        ...(filters.category ? { category: { equals: filters.category, mode: 'insensitive' as const } } : {}),
        ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' as const } } : {}),
      },
      include: {
        provider: {
          select: {
            id: true,
            specialty: true,
            ratingAvg: true,
            selo: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });

    return deals.map((d) => ({
      id: d.id,
      category: d.category,
      title: d.title,
      description: d.description,
      city: d.city,
      state: d.state,
      originalPrice: d.originalPrice,
      dealPrice: d.dealPrice,
      discountPct: d.originalPrice > 0 ? Math.round((1 - d.dealPrice / d.originalPrice) * 100) : 0,
      scheduledAt: d.scheduledAt,
      provider: {
        id: d.provider.id,
        name: d.provider.user.name,
        avatarUrl: d.provider.user.avatarUrl,
        specialty: d.provider.specialty,
        ratingAvg: d.provider.ratingAvg,
        selo: d.provider.selo,
      },
    }));
  }

  async listMine(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');

    return this.prisma.lastMinuteDeal.findMany({
      where: { providerId: provider.id },
      include: { claimedBy: { select: { name: true, phone: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async cancel(userId: string, id: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');

    const deal = await this.prisma.lastMinuteDeal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Vaga não encontrada');
    if (deal.providerId !== provider.id) throw new ForbiddenException('Esta vaga não é sua');
    if (deal.status !== DealStatus.ATIVA) {
      throw new BadRequestException('Esta vaga não pode mais ser cancelada');
    }

    return this.prisma.lastMinuteDeal.update({ where: { id }, data: { status: DealStatus.CANCELADA } });
  }

  /**
   * "Primeiro a pegar, leva": o update só aplica se a vaga ainda estiver ATIVA,
   * evitando que dois clientes reservem a mesma vaga numa corrida. Ao reservar,
   * cria uma reserva normal (Booking) já ACEITA — mesmos requisitos da agenda
   * comum (status, avaliação depois de concluído), só muda como o cliente chegou
   * até o prestador.
   */
  async claim(userId: string, id: string) {
    const deal = await this.prisma.lastMinuteDeal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Vaga não encontrada');

    const result = await this.prisma.lastMinuteDeal.updateMany({
      where: { id, status: DealStatus.ATIVA },
      data: { status: DealStatus.RESERVADA, claimedById: userId, claimedAt: new Date() },
    });
    if (result.count === 0) {
      throw new BadRequestException('Essa vaga já foi reservada por outra pessoa');
    }

    const provider = await this.prisma.providerProfile.findUnique({ where: { id: deal.providerId } });
    const client = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    if (provider) {
      await this.prisma.booking.create({
        data: {
          clientId: userId,
          providerId: provider.id,
          status: BookingStatus.ACEITO,
          scheduledAt: deal.scheduledAt,
          notes: `Vaga de última hora: ${deal.title}`,
          priceQuoted: deal.dealPrice,
        },
      });

      await this.notificationsService.create({
        userId: provider.userId,
        type: NotificationType.VAGA_RESERVADA,
        title: `Vaga reservada: ${deal.title}`,
        body: `${client?.name ?? 'Um cliente'} reservou sua vaga de última hora por R$ ${deal.dealPrice.toFixed(2).replace('.', ',')}.`,
        link: '/painel/vagas-ultima-hora',
      });
    }

    return this.prisma.lastMinuteDeal.findUnique({ where: { id } });
  }
}
