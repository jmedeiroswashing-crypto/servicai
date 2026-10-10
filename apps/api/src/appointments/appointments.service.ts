import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../generated/prisma/enums.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';

const REMINDER_WINDOW_MINUTES = 5;

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateAppointmentDto) {
    const provider = await this.providersService.findByUserId(userId);
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Data inválida');

    return this.prisma.appointment.create({
      data: {
        providerId: provider.id,
        title: dto.title,
        notes: dto.notes,
        scheduledAt,
      },
    });
  }

  async findMine(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.appointment.findMany({
      where: { providerId: provider.id },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async remove(userId: string, id: string) {
    const provider = await this.providersService.findByUserId(userId);
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Compromisso não encontrado');
    if (appointment.providerId !== provider.id) throw new ForbiddenException('Você não é o dono deste compromisso');
    return this.prisma.appointment.delete({ where: { id } });
  }

  /**
   * Notifica (push + in-app) quando um compromisso está prestes a acontecer —
   * funciona mesmo com o app fechado, porque usa a mesma notificação push já
   * usada pra mensagem/proposta/etc. Roda a cada 5 min; a janela de 5 min pra
   * trás evita perder um compromisso se o cron atrasar um pouco.
   */
  @Cron('*/5 * * * *')
  async sendDueReminders() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - REMINDER_WINDOW_MINUTES * 60_000);
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60_000);

    const due = await this.prisma.appointment.findMany({
      where: { scheduledAt: { gte: windowStart, lte: windowEnd }, notifiedAt: null },
      include: { provider: { select: { userId: true } } },
    });

    let sent = 0;
    for (const appointment of due) {
      await this.notificationsService.create({
        userId: appointment.provider.userId,
        type: NotificationType.LEMBRETE_COMPROMISSO,
        title: 'Compromisso agora',
        body: appointment.title,
        link: '/painel/agenda',
      });
      await this.prisma.appointment.update({ where: { id: appointment.id }, data: { notifiedAt: now } });
      sent += 1;
    }

    if (sent > 0) this.logger.log(`${sent} lembrete(s) de compromisso enviado(s).`);
    return { sent };
  }
}
