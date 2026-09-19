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
