import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.expense.create({
      data: {
        providerId: provider.id,
        description: dto.description,
        category: dto.category,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        isRecurring: dto.isRecurring ?? false,
      },
    });
  }

  async findMine(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.expense.findMany({
      where: { providerId: provider.id },
      orderBy: { date: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const provider = await this.providersService.findByUserId(userId);
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Despesa não encontrada');
    if (expense.providerId !== provider.id) throw new ForbiddenException('Você não é o dono desta despesa');
    return this.prisma.expense.delete({ where: { id } });
  }

  /**
   * Para cada despesa marcada como recorrente, gera uma cópia para o mês
   * atual — só se ainda não existir uma cópia desse mês, para não duplicar
   * se o job rodar mais de uma vez. A despesa original nunca é alterada,
   * ela é só o "molde"; cada cópia é uma ocorrência real de um mês.
   */
  @Cron('0 6 1 * *')
  async generateRecurringExpenses() {
    const templates = await this.prisma.expense.findMany({ where: { isRecurring: true, recurringParentId: null } });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let created = 0;
    for (const template of templates) {
      if (template.date >= monthStart && template.date < monthEnd) continue;

      const existingClone = await this.prisma.expense.findFirst({
        where: { recurringParentId: template.id, date: { gte: monthStart, lt: monthEnd } },
      });
      if (existingClone) continue;

      await this.prisma.expense.create({
        data: {
          providerId: template.providerId,
          description: template.description,
          category: template.category,
          amount: template.amount,
          date: now,
          isRecurring: false,
          recurringParentId: template.id,
        },
      });
      created += 1;
    }

    if (created > 0) this.logger.log(`${created} despesa(s) recorrente(s) geradas para o mês atual.`);
    return { created };
  }
}
