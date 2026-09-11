import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { BookingStatus } from '../generated/prisma/enums.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';

const PROVIDER_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  SOLICITADO: ['ACEITO', 'RECUSADO'],
  ACEITO: ['EM_ANDAMENTO', 'CANCELADO'],
  EM_ANDAMENTO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  RECUSADO: [],
  CANCELADO: [],
};

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  create(clientId: string, dto: CreateBookingDto) {
    return this.prisma.booking.create({
      data: {
        clientId,
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        address: dto.address,
        notes: dto.notes,
      },
      include: { service: true, provider: { include: { user: { select: { name: true } } } } },
    });
  }

  findMine(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: { provider: { include: { user: { select: { name: true, avatarUrl: true } } } }, service: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForProvider(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.booking.findMany({
      where: { providerId: provider.id },
      include: { client: { select: { name: true, avatarUrl: true, phone: true } }, service: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatusAsProvider(userId: string, bookingId: string, status: BookingStatus) {
    const booking = await this.getOrThrow(bookingId);
    const provider = await this.providersService.assertOwnership(userId, booking.providerId);
    if (provider.id !== booking.providerId) throw new ForbiddenException('Reserva não pertence a este prestador');

    const allowed = PROVIDER_TRANSITIONS[booking.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Não é possível mudar de ${booking.status} para ${status}`);
    }

    return this.prisma.booking.update({ where: { id: bookingId }, data: { status } });
  }

  async cancelAsClient(clientId: string, bookingId: string) {
    const booking = await this.getOrThrow(bookingId);
    if (booking.clientId !== clientId) throw new ForbiddenException('Reserva não pertence a este cliente');
    if (booking.status === BookingStatus.CONCLUIDO) {
      throw new BadRequestException('Não é possível cancelar um serviço já concluído');
    }
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CANCELADO } });
  }

  private async getOrThrow(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Reserva não encontrada');
    return booking;
  }
}
