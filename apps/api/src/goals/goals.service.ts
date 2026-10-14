import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { UpsertGoalDto } from './dto/upsert-goal.dto.js';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private providersService: ProvidersService,
  ) {}

  /**
   * Editar o valor da meta reseta `reachedAt` — sem isso, quem aumentasse a
   * meta depois de já ter batido a anterior nunca mais seria notificado ao
   * alcançar a nova.
   */
  async upsert(userId: string, dto: UpsertGoalDto) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.financialGoal.upsert({
      where: { providerId_month: { providerId: provider.id, month: dto.month } },
      create: { providerId: provider.id, month: dto.month, targetAmount: dto.targetAmount },
      update: { targetAmount: dto.targetAmount, reachedAt: null },
    });
  }

  async findMine(userId: string) {
    const provider = await this.providersService.findByUserId(userId);
    return this.prisma.financialGoal.findMany({
      where: { providerId: provider.id },
      orderBy: { month: 'desc' },
    });
  }

  async remove(userId: string, month: string) {
    const provider = await this.providersService.findByUserId(userId);
    const goal = await this.prisma.financialGoal.findUnique({
      where: { providerId_month: { providerId: provider.id, month } },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada para este mês');
    return this.prisma.financialGoal.delete({ where: { id: goal.id } });
  }
}
