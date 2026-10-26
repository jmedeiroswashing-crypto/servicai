import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { BookingStatus } from '../generated/prisma/enums.js';

export interface CalendarDay {
  date: string; // "YYYY-MM-DD"
  incomeTotal: number;
  expenseTotal: number;
  profit: number;
  appointmentsCount: number;
  bookingsCount: number;
}

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  /**
   * Um dia por entrada do mês, com lucro/prejuízo do dia (pra colorir o
   * calendário) e quantos compromissos/reservas caem naquele dia (pros
   * pontinhos). Reaproveita Income (já inclui receita manual e de reserva
   * concluída — ver BookingsService.updateStatusAsProvider) e Expense.
   */
  async getMonth(userId: string, month: string): Promise<CalendarDay[]> {
    const provider = await this.providersService.findByUserId(userId);
    const [year, monthNum] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNum - 1, 1));
    const end = new Date(Date.UTC(year, monthNum, 1));

    const [incomes, expenses, appointments, bookings] = await Promise.all([
      this.prisma.income.findMany({
        where: { providerId: provider.id, date: { gte: start, lt: end } },
        select: { amount: true, date: true },
      }),
      this.prisma.expense.findMany({
        where: { providerId: provider.id, date: { gte: start, lt: end } },
        select: { amount: true, date: true },
      }),
      this.prisma.appointment.findMany({
        where: { providerId: provider.id, scheduledAt: { gte: start, lt: end } },
        select: { scheduledAt: true },
      }),
      this.prisma.booking.findMany({
        where: {
          providerId: provider.id,
          scheduledAt: { gte: start, lt: end },
          status: { not: BookingStatus.CANCELADO },
        },
        select: { scheduledAt: true },
      }),
    ]);

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const days = new Map<string, CalendarDay>();
    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayKey(new Date(Date.UTC(year, monthNum - 1, d)));
      days.set(key, { date: key, incomeTotal: 0, expenseTotal: 0, profit: 0, appointmentsCount: 0, bookingsCount: 0 });
    }

    for (const i of incomes) {
      const entry = days.get(dayKey(i.date));
      if (entry) entry.incomeTotal += i.amount;
    }
    for (const e of expenses) {
      const entry = days.get(dayKey(e.date));
      if (entry) entry.expenseTotal += e.amount;
    }
    for (const a of appointments) {
      const entry = days.get(dayKey(a.scheduledAt));
      if (entry) entry.appointmentsCount += 1;
    }
    for (const b of bookings) {
      if (!b.scheduledAt) continue;
      const entry = days.get(dayKey(b.scheduledAt));
      if (entry) entry.bookingsCount += 1;
    }

    for (const entry of days.values()) entry.profit = entry.incomeTotal - entry.expenseTotal;

    return [...days.values()];
  }
}
