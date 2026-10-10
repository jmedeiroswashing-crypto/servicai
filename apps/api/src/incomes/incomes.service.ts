import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';

@Injectable()
export class IncomesService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  async create(userId: string, dto: CreateIncomeDto) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.income.create({
      data: {
        providerId: provider.id,
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async findMine(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.income.findMany({
      where: { providerId: provider.id },
      orderBy: { date: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const provider = await this.providersService.findByUserId(userId);
    const income = await this.prisma.income.findUnique({ where: { id } });
    if (!income) throw new NotFoundException('Receita não encontrada');
    if (income.providerId !== provider.id) throw new ForbiddenException('Você não é o dono desta receita');
    return this.prisma.income.delete({ where: { id } });
  }
}
