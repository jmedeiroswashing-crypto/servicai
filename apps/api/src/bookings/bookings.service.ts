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
    return this.prisma.booking.create({
      data: {
        clientId,
        providerId: dto.providerId,
        serviceId: dto.serviceId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
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
