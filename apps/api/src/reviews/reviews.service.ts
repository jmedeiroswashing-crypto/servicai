import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { BookingStatus } from '../generated/prisma/enums.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  async create(clientId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: true },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada');
    if (booking.clientId !== clientId) throw new ForbiddenException('Você só pode avaliar suas próprias contratações');
    if (booking.status !== BookingStatus.CONCLUIDO) {
      throw new BadRequestException('Só é possível avaliar serviços concluídos');
    }
    if (booking.review) throw new ConflictException('Esta reserva já foi avaliada');

    const review = await this.prisma.review.create({
      data: {
        bookingId: booking.id,
        clientId,
        providerId: booking.providerId,
        rating: dto.rating,
        pontualidade: dto.pontualidade,
        qualidade: dto.qualidade,
        preco: dto.preco,
        atendimento: dto.atendimento,
        comment: dto.comment,
        photoUrls: dto.photoUrls ?? [],
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
      },
    });

    await this.providersService.recalculateScore(booking.providerId);

    return review;
  }

  findForProvider(providerId: string) {
    return this.prisma.review.findMany({
      where: { providerId },
      include: { client: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
