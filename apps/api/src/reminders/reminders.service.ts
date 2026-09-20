import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { BookingStatus, NotificationType } from '../generated/prisma/enums.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/**
 * Só categorias que realmente costumam se repetir num intervalo previsível
 * ganham lembrete — nada de sugerir "hora de refazer sua instalação elétrica"
 * pra um serviço que é naturalmente único. Intervalos são estimativas de bom
 * senso, não dado científico.
 */
const RECURRING_INTERVALS_DAYS: Record<string, number> = {
  Limpeza: 30,
  Barbeiro: 21,
  Salão: 30,
  'Lava Rápido': 15,
  Estética: 30,
  Psicólogo: 7,
  'Professor Particular': 7,
  'Ar-condicionado': 180,
  Refrigeração: 180,
  Mecânico: 180,
  Odontologia: 180,
  Médico: 180,
};

const REMINDER_LABEL: Record<string, string> = {
  Limpeza: 'sua última limpeza',
  Barbeiro: 'seu último corte',
  Salão: 'sua última visita ao salão',
  'Lava Rápido': 'sua última lavagem do carro',
  Estética: 'seu último procedimento estético',
  Psicólogo: 'sua última sessão de terapia',
  'Professor Particular': 'sua última aula particular',
  'Ar-condicionado': 'sua última manutenção do ar-condicionado',
  Refrigeração: 'sua última manutenção de refrigeração',
  Mecânico: 'sua última revisão do carro',
  Odontologia: 'sua última consulta odontológica',
  Médico: 'sua última consulta médica',
};

const REMINDER_COOLDOWN_HOURS = 30 * 24;
const REVIEW_REMINDER_DELAY_DAYS = 2;
const DIGEST_COOLDOWN_HOURS = 6 * 24;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkMaintenanceReminders() {
    let sent = 0;
    for (const category of Object.keys(RECURRING_INTERVALS_DAYS)) {
      sent += await this.checkCategory(category);
    }
    this.logger.log(`Lembretes de manutenção: ${sent} notificação(ões) enviada(s).`);
    return sent;
  }

  /**
   * Limpeza em massa de "disponível agora" vencido — cada leitura já confere
   * a expiração na hora (providers.service.ts), então isso é só housekeeping
   * pra não deixar linhas com availableNow=true acumulando indefinidamente no
   * banco depois que a janela passou.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireAvailability() {
    const result = await this.prisma.providerProfile.updateMany({
      where: { availableNow: true, availableUntil: { lt: new Date() } },
      data: { availableNow: false, availableUntil: null },
    });
    if (result.count > 0) {
      this.logger.log(`Disponibilidade expirada limpa para ${result.count} prestador(es).`);
    }
    return result.count;
  }

  /**
   * Avaliação hoje é 100% passiva — depende do cliente lembrar sozinho de
   * avaliar. Um único lembrete por reserva (nunca mais que isso, controlado
   * por reviewReminderSentAt na própria reserva, não por uma janela de tempo
   * genérica) evita virar spam pra quem decidiu não avaliar.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkReviewReminders() {
    const cutoff = new Date(Date.now() - REVIEW_REMINDER_DELAY_DAYS * 24 * 60 * 60 * 1000);

    const pending = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONCLUIDO,
        updatedAt: { lte: cutoff },
        reviewReminderSentAt: null,
        review: null,
      },
      include: { provider: { include: { user: { select: { name: true } } } } },
    });

    for (const booking of pending) {
      await this.notificationsService.create({
        userId: booking.clientId,
        type: NotificationType.LEMBRETE_AVALIACAO,
        title: 'Como foi seu serviço?',
        body: `Avalie ${booking.provider.user.name} e ajude outros clientes a escolher bem.`,
        link: '/minhas-reservas',
      });
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { reviewReminderSentAt: new Date() },
      });
    }

    this.logger.log(`Lembretes de avaliação: ${pending.length} enviado(s).`);
    return pending.length;
  }

  /**
   * Resumo semanal: diferente dos outros lembretes (reativos a um evento
   * específico), esse é proativo — junta o que já existe (faturamento, agenda,
   * avaliações, oportunidades) numa mensagem só, toda segunda de manhã. Só
   * envia se teve algum movimento real: um prestador sem nada acontecendo não
   * recebe um resumo vazio, isso seria ruído, não valor.
   */
  @Cron('0 8 * * 1')
  async sendWeeklyDigest() {
    const providers = await this.prisma.providerProfile.findMany({
      where: { user: { deletedAt: null } },
      select: { id: true, userId: true },
    });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let sent = 0;
    for (const provider of providers) {
      const [earningsAgg, newReviewsCount, pendingProposalsCount, openDealsCount] = await Promise.all([
        this.prisma.booking.aggregate({
          where: {
            providerId: provider.id,
            status: BookingStatus.CONCLUIDO,
            updatedAt: { gte: weekAgo },
            priceQuoted: { not: null },
          },
          _sum: { priceQuoted: true },
        }),
        this.prisma.review.count({ where: { providerId: provider.id, createdAt: { gte: weekAgo } } }),
        this.prisma.proposal.count({ where: { providerId: provider.id, status: 'ENVIADA' } }),
        this.prisma.lastMinuteDeal.count({
          where: { providerId: provider.id, status: 'ATIVA', scheduledAt: { gt: new Date() } },
        }),
      ]);

      const weeklyEarnings = earningsAgg._sum.priceQuoted ?? 0;
      if (weeklyEarnings === 0 && newReviewsCount === 0 && pendingProposalsCount === 0 && openDealsCount === 0) {
        continue;
      }

      const parts: string[] = [];
      if (weeklyEarnings > 0) parts.push(`R$ ${weeklyEarnings.toFixed(0)} em serviços concluídos`);
      if (pendingProposalsCount > 0) parts.push(`${pendingProposalsCount} proposta(s) aguardando resposta`);
      if (newReviewsCount > 0) parts.push(`${newReviewsCount} avaliação(ões) nova(s)`);
      if (openDealsCount > 0) parts.push(`${openDealsCount} vaga(s) de última hora aberta(s)`);

      const notification = await this.notificationsService.createIfNotRecentlyNotified(
        {
          userId: provider.userId,
          type: NotificationType.RESUMO_SEMANAL,
          title: 'Seu resumo da semana',
          body: parts.join(' · '),
          link: '/painel',
        },
        DIGEST_COOLDOWN_HOURS,
      );

      const isNew = Date.now() - notification.createdAt.getTime() < 60_000;
      if (isNew) sent++;
    }

    this.logger.log(`Resumo semanal: ${sent} enviado(s).`);
    return sent;
  }

  private async checkCategory(category: string): Promise<number> {
    const intervalDays = RECURRING_INTERVALS_DAYS[category];

    const latestByClient = await this.prisma.booking.groupBy({
      by: ['clientId'],
      where: { category, status: BookingStatus.CONCLUIDO },
      _max: { updatedAt: true },
    });

    let sent = 0;
    for (const entry of latestByClient) {
      const lastServiceAt = entry._max.updatedAt;
      if (!lastServiceAt) continue;

      const daysSince = (Date.now() - lastServiceAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < intervalDays) continue;

      const notification = await this.notificationsService.createIfNotRecentlyNotified(
        {
          userId: entry.clientId,
          type: NotificationType.LEMBRETE_MANUTENCAO,
          title: 'Hora de agendar de novo?',
          body: `Já fazem ${Math.floor(daysSince)} dias desde ${REMINDER_LABEL[category] ?? `seu último serviço de ${category.toLowerCase()}`}. Veja profissionais disponíveis agora.`,
          link: `/buscar?q=${encodeURIComponent(category)}`,
        },
        REMINDER_COOLDOWN_HOURS,
      );

      // createIfNotRecentlyNotified também retorna a notificação já existente
      // quando está em cooldown — só contamos como "enviada" quando é nova.
      const isNew = Date.now() - notification.createdAt.getTime() < 60_000;
      if (isNew) sent++;
    }
    return sent;
  }
}
