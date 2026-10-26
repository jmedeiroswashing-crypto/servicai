import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { CashMovementType } from '../generated/prisma/enums.js';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto.js';
import { AddCashMovementDto } from './dto/add-cash-movement.dto.js';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto.js';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayBounds(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);
  return { start, end };
}

@Injectable()
export class CashRegisterService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  /**
   * "Esperado" é uma estimativa: troco de abertura + receita lançada no dia
   * (manual ou de reserva concluída) + suprimentos - sangrias - despesas
   * lançadas no dia. O ServiçAi não rastreia forma de pagamento por
   * lançamento, então isso não distingue dinheiro de Pix/cartão como o
   * Escala Business original faz — é só uma conferência aproximada.
   */
  private async computeExpected(providerId: string, dateKey: string, openingAmount: number, movements: { type: CashMovementType; amount: number }[]) {
    const { start, end } = dayBounds(dateKey);
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.aggregate({
        where: { providerId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { providerId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);
    const sangrias = movements.filter((m) => m.type === CashMovementType.SANGRIA).reduce((s, m) => s + m.amount, 0);
    const suprimentos = movements.filter((m) => m.type === CashMovementType.SUPRIMENTO).reduce((s, m) => s + m.amount, 0);
    return openingAmount + (incomes._sum.amount ?? 0) - (expenses._sum.amount ?? 0) + suprimentos - sangrias;
  }

  async today(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const dateKey = todayKey();
    const register = await this.prisma.cashRegister.findUnique({
      where: { providerId_date: { providerId: provider.id, date: dateKey } },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
    if (!register) return null;

    const expectedAmount = register.closedAt
      ? null
      : await this.computeExpected(provider.id, dateKey, register.openingAmount, register.movements);

    return { ...register, expectedAmount };
  }

  async open(userId: string, dto: OpenCashRegisterDto) {
    const provider = await this.providersService.findByUserId(userId);
    const dateKey = todayKey();
    const existing = await this.prisma.cashRegister.findUnique({
      where: { providerId_date: { providerId: provider.id, date: dateKey } },
    });
    if (existing) throw new ConflictException('O caixa de hoje já está aberto');

    return this.prisma.cashRegister.create({
      data: { providerId: provider.id, date: dateKey, openingAmount: dto.openingAmount },
    });
  }

  private async getTodayOpenOrThrow(providerId: string) {
    const register = await this.prisma.cashRegister.findUnique({
      where: { providerId_date: { providerId, date: todayKey() } },
    });
    if (!register) throw new NotFoundException('Abra o caixa de hoje primeiro');
    if (register.closedAt) throw new BadRequestException('O caixa de hoje já está fechado');
    return register;
  }

  async addMovement(userId: string, dto: AddCashMovementDto) {
    const provider = await this.providersService.findByUserId(userId);
    const register = await this.getTodayOpenOrThrow(provider.id);
    return this.prisma.cashMovement.create({
      data: { cashRegisterId: register.id, type: dto.type, amount: dto.amount, reason: dto.reason },
    });
  }

  async close(userId: string, dto: CloseCashRegisterDto) {
    const provider = await this.providersService.findByUserId(userId);
    const register = await this.getTodayOpenOrThrow(provider.id);
    return this.prisma.cashRegister.update({
      where: { id: register.id },
      data: { closingCountedAmount: dto.countedAmount, closedAt: new Date() },
    });
  }

  async reopen(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    const register = await this.prisma.cashRegister.findUnique({
      where: { providerId_date: { providerId: provider.id, date: todayKey() } },
    });
    if (!register || !register.closedAt) throw new BadRequestException('Não há caixa fechado hoje para reabrir');
    return this.prisma.cashRegister.update({
      where: { id: register.id },
      data: { closingCountedAmount: null, closedAt: null },
    });
  }

  async history(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.cashRegister.findMany({
      where: { providerId: provider.id },
      include: { movements: true },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }
}
