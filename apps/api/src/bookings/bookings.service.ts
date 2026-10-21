import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BookingStatus, IncomeSource, NotificationType } from '../generated/prisma/enums.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { isWithinBusinessHours } from '../providers/business-hours.js';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.SOLICITADO,
  BookingStatus.ACEITO,
  BookingStatus.EM_ANDAMENTO,
];

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
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Categoria é salva na reserva (não só no serviço) para dar base aos
   * lembretes de manutenção recorrente — sem isso não teria como saber que
   * tipo de serviço foi feito quando o cliente contrata direto, sem
   * selecionar um Service específico.
   */
  private async resolveCategory(providerId: string, serviceId?: string) {
    if (serviceId) {
      const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
      if (service) return service.category;
    }
    const provider = await this.prisma.providerProfile.findUnique({ where: { id: providerId } });
    return provider?.specialty;
  }

  async create(clientId: string, dto: CreateBookingDto) {
    const category = await this.resolveCategory(dto.providerId, dto.serviceId);

    let scheduledAt: Date | undefined;
    if (dto.scheduledAt) {
      scheduledAt = new Date(dto.scheduledAt);

      const provider = await this.prisma.providerProfile.findUnique({
        where: { id: dto.providerId },
        select: { businessHours: true },
      });
      if (!provider) throw new NotFoundException('Prestador não encontrado');

      if (!isWithinBusinessHours(provider.businessHours, scheduledAt)) {
        throw new BadRequestException('Este horário está fora do atendimento do prestador');
      }

      const conflict = await this.prisma.booking.findFirst({
        where: { providerId: dto.providerId, scheduledAt, status: { in: ACTIVE_BOOKING_STATUSES } },
      });
      if (conflict) {
        throw new BadRequestException('Este horário já está reservado, escolha outro');
      }
    }

    return this.prisma.booking.create({
      data: {
        clientId,
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        scheduledAt,
        address: dto.address,
        notes: dto.notes,
        category,
      },
      include: { service: true, provider: { include: { user: { select: { name: true } } } } },
    });
  }

  findMine(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: {
        provider: { include: { user: { select: { name: true, avatarUrl: true } } } },
        service: true,
        review: true,
      },
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

  /**
   * A checagem de transição acima lê o status antes de escrever, o que não é
   * atômico — duas chamadas concorrentes (duplo clique, retry de rede)
   * poderiam ambas passar a validação e ambas tentar concluir a mesma
   * reserva, o que duplicaria a receita automática abaixo. Por isso a
   * escrita do status usa `updateMany` condicionado ao status ainda válido:
   * só quem "ganha a corrida" segue adiante.
   *
   * Quando a reserva é concluída com preço combinado, a venda é registrada
   * automaticamente como receita (Income) vinculada a esta reserva —
   * `Income.bookingId` é único, então mesmo que este método seja chamado de
   * novo por algum motivo, nunca duplica o lançamento. Isso NÃO significa
   * pagamento confirmado — é só o registro da venda, igual já era descrito
   * no Faturamento manual.
   */
  async updateStatusAsProvider(userId: string, bookingId: string, status: BookingStatus) {
    const booking = await this.getOrThrow(bookingId);
    const provider = await this.providersService.assertOwnership(userId, booking.providerId);
    if (provider.id !== booking.providerId) throw new ForbiddenException('Reserva não pertence a este prestador');

    const allowed = PROVIDER_TRANSITIONS[booking.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Não é possível mudar de ${booking.status} para ${status}`);
    }

    const { income } = await this.prisma.$transaction(async (tx) => {
      const result = await tx.booking.updateMany({
        where: { id: bookingId, status: booking.status },
        data: { status },
      });
      if (result.count === 0) {
        throw new BadRequestException('Esta reserva já foi atualizada por outra solicitação');
      }

      if (status !== BookingStatus.CONCLUIDO || booking.priceQuoted == null) {
        return { income: null };
      }

      const income = await tx.income.create({
        data: {
          providerId: booking.providerId,
          description: `Reserva concluída${booking.category ? ` — ${booking.category}` : ''}`,
          amount: booking.priceQuoted,
          source: IncomeSource.RESERVA,
          bookingId: booking.id,
        },
      });
      return { income };
    });

    const updatedBooking = { ...booking, status };

    let recognition: { title: string; body: string } | null = null;
    if (income) {
      // Esperado (não disparado em segundo plano): em função serverless a
      // execução pode ser encerrada assim que a resposta é enviada, então um
      // "fire-and-forget" aqui arriscaria nunca completar o reconhecimento.
      // O catch garante que uma falha aqui não derruba a conclusão da reserva.
      recognition = await this.notifySaleRecognition(updatedBooking, income).catch((err) => {
        this.logger.error('Falha ao processar reconhecimento de venda', err as Error);
        return null;
      });
    }

    // `recognition` é só um extra pra UI mostrar a mesma mensagem na hora,
    // sem esperar o fetch de notificações — não é um campo do Booking.
    return { ...updatedBooking, recognition };
  }

  /**
   * Mensagens de reconhecimento: só dispara com condições reais e
   * verificáveis (nunca inventa "crescimento" ou "satisfação do cliente").
   * Primeira venda > cliente recorrente > venda comum, nessa ordem de
   * prioridade. Roda depois da transação principal já ter sido confirmada —
   * é reconhecimento, não é o que garante a venda em si, então um erro aqui
   * não deve derrubar a conclusão da reserva (ver .catch no chamador).
   */
  private async notifySaleRecognition(
    booking: { id: string; providerId: string; clientId: string },
    income: { id: string },
  ): Promise<{ title: string; body: string } | null> {
    const provider = await this.prisma.providerProfile.findUnique({ where: { id: booking.providerId } });
    if (!provider) return null;

    const [previousSales, priorBookingsFromClient] = await Promise.all([
      this.prisma.income.count({
        where: { providerId: booking.providerId, source: IncomeSource.RESERVA, id: { not: income.id } },
      }),
      this.prisma.booking.count({
        where: {
          providerId: booking.providerId,
          clientId: booking.clientId,
          status: BookingStatus.CONCLUIDO,
          id: { not: booking.id },
        },
      }),
    ]);

    let title: string;
    let body: string;
    if (previousSales === 0) {
      title = 'Primeira venda registrada! 🚀';
      body =
        'Parabéns pela sua primeira venda no ServiçAi! Toda grande trajetória começa com uma conquista — esse é só o início de muitas novas oportunidades para o seu negócio.';
    } else if (priorBookingsFromClient > 0) {
      title = 'Um cliente voltou a te contratar!';
      body = 'Um cliente escolheu seu trabalho de novo — isso é sinal de confiança. Continue fortalecendo esse relacionamento.';
    } else {
      title = 'Nova venda registrada!';
      body =
        'Mais uma conquista: sua dedicação continua abrindo portas e aproximando você de novos clientes. Continue evoluindo com o ServiçAi.';
    }

    await this.notificationsService.create({
      userId: provider.userId,
      type: NotificationType.VENDA_REGISTRADA,
      title,
      body,
      link: '/painel/faturamento',
    });

    await this.checkGoalReached(booking.providerId, provider.userId);

    return { title, body };
  }

  /**
   * Só verifica a meta do mês corrente, e só dispara uma vez (marca
   * `reachedAt`) — sem isso, toda venda seguinte no mesmo mês repetiria a
   * notificação.
   */
  private async checkGoalReached(providerId: string, userId: string) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const goal = await this.prisma.financialGoal.findUnique({ where: { providerId_month: { providerId, month } } });
    if (!goal || goal.reachedAt) return;

    const netProfit = await this.computeNetProfitForMonth(providerId, month);
    if (netProfit < goal.targetAmount) return;

    await this.prisma.financialGoal.update({ where: { id: goal.id }, data: { reachedAt: new Date() } });
    await this.notificationsService.create({
      userId,
      type: NotificationType.META_ATINGIDA,
      title: 'Meta do mês alcançada! 🎯',
      body: `Você bateu sua meta de R$ ${goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para este mês. Aproveite essa conquista e continue construindo seus próximos resultados!`,
      link: '/painel/faturamento',
    });
  }

  private async computeNetProfitForMonth(providerId: string, monthKey: string): Promise<number> {
    const [year, month] = monthKey.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const [bookings, expenses, incomes] = await Promise.all([
      this.prisma.booking.findMany({
        where: { providerId, status: BookingStatus.CONCLUIDO, priceQuoted: { not: null }, updatedAt: { gte: start, lt: end } },
        select: { priceQuoted: true },
      }),
      this.prisma.expense.findMany({ where: { providerId, date: { gte: start, lt: end } }, select: { amount: true } }),
      this.prisma.income.findMany({ where: { providerId, date: { gte: start, lt: end } }, select: { amount: true } }),
    ]);

    const revenue = bookings.reduce((sum, b) => sum + (b.priceQuoted ?? 0), 0) + incomes.reduce((sum, i) => sum + i.amount, 0);
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    return revenue - expenseTotal;
  }

  /**
   * Faturamento do prestador: receita soma reservas CONCLUIDO com preço
   * combinado (não é pagamento confirmado, o app ainda não processa
   * pagamento — aviso explícito na tela) + receita lançada manualmente
   * (ex: serviço cobrado fora da plataforma). Ticket médio continua baseado
   * só em reservas de verdade, pra não distorcer com lançamentos avulsos.
   * Despesas vêm do registro manual que o próprio prestador lança, para dar
   * uma visão de lucro líquido real, não só receita bruta.
   */
  async getEarnings(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const [completed, expenses, incomes] = await Promise.all([
      this.prisma.booking.findMany({
        where: { providerId: provider.id, status: BookingStatus.CONCLUIDO, priceQuoted: { not: null } },
        select: { priceQuoted: true, updatedAt: true },
      }),
      this.prisma.expense.findMany({
        where: { providerId: provider.id },
        select: { amount: true, date: true },
      }),
      this.prisma.income.findMany({
        where: { providerId: provider.id },
        select: { amount: true, date: true },
      }),
    ]);

    const now = new Date();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const byMonth = new Map<string, { bookingTotal: number; count: number; expenses: number; manualIncome: number }>();
    for (const b of completed) {
      const key = monthKey(b.updatedAt);
      const entry = byMonth.get(key) ?? { bookingTotal: 0, count: 0, expenses: 0, manualIncome: 0 };
      entry.bookingTotal += b.priceQuoted ?? 0;
      entry.count += 1;
      byMonth.set(key, entry);
    }
    for (const e of expenses) {
      const key = monthKey(e.date);
      const entry = byMonth.get(key) ?? { bookingTotal: 0, count: 0, expenses: 0, manualIncome: 0 };
      entry.expenses += e.amount;
      byMonth.set(key, entry);
    }
    for (const inc of incomes) {
      const key = monthKey(inc.date);
      const entry = byMonth.get(key) ?? { bookingTotal: 0, count: 0, expenses: 0, manualIncome: 0 };
      entry.manualIncome += inc.amount;
      byMonth.set(key, entry);
    }

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const entry = byMonth.get(monthKey(d)) ?? { bookingTotal: 0, count: 0, expenses: 0, manualIncome: 0 };
      months.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short' }),
        total: entry.bookingTotal + entry.manualIncome,
        count: entry.count,
        expenses: entry.expenses,
      });
    }

    const currentMonth = byMonth.get(monthKey(now)) ?? { bookingTotal: 0, count: 0, expenses: 0, manualIncome: 0 };
    const bookingRevenueAllTime = completed.reduce((sum, b) => sum + (b.priceQuoted ?? 0), 0);
    const manualIncomeAllTime = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalAllTime = bookingRevenueAllTime + manualIncomeAllTime;
    const totalExpensesAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentMonthTotal = currentMonth.bookingTotal + currentMonth.manualIncome;

    return {
      currentMonthTotal,
      currentMonthCount: currentMonth.count,
      currentMonthExpenses: currentMonth.expenses,
      netProfitCurrentMonth: currentMonthTotal - currentMonth.expenses,
      totalAllTime,
      totalExpensesAllTime,
      netProfitAllTime: totalAllTime - totalExpensesAllTime,
      totalServicesCompleted: completed.length,
      avgTicket: completed.length > 0 ? bookingRevenueAllTime / completed.length : 0,
      months,
    };
  }

  async getClients(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const completed = await this.prisma.booking.findMany({
      where: { providerId: provider.id, status: BookingStatus.CONCLUIDO },
      select: {
        clientId: true,
        priceQuoted: true,
        updatedAt: true,
        client: { select: { name: true, phone: true, avatarUrl: true } },
      },
    });

    const byClient = new Map<
      string,
      { clientId: string; name: string; phone: string | null; avatarUrl: string | null; totalSpent: number; servicesCount: number; lastServiceAt: Date }
    >();
    for (const b of completed) {
      const entry = byClient.get(b.clientId) ?? {
        clientId: b.clientId,
        name: b.client.name,
        phone: b.client.phone,
        avatarUrl: b.client.avatarUrl,
        totalSpent: 0,
        servicesCount: 0,
        lastServiceAt: b.updatedAt,
      };
      entry.totalSpent += b.priceQuoted ?? 0;
      entry.servicesCount += 1;
      if (b.updatedAt > entry.lastServiceAt) entry.lastServiceAt = b.updatedAt;
      byClient.set(b.clientId, entry);
    }

    return Array.from(byClient.values()).sort((a, b) => b.totalSpent - a.totalSpent);
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
