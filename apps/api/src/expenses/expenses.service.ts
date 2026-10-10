import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';

@Injectable()
export class ExpensesService {
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
}
