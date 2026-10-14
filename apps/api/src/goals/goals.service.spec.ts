import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GoalsService } from './goals.service.js';

function buildService() {
  const prisma = {
    financialGoal: { upsert: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  };
  const providersService = { findByUserId: vi.fn() };
  const service = new GoalsService(prisma as never, providersService as never);
  return { service, prisma, providersService };
}

describe('GoalsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('upsert', () => {
    it('cria a meta do mês associada ao prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.financialGoal.upsert.mockResolvedValue({ id: 'goal1' });

      await service.upsert('user1', { month: '2026-10', targetAmount: 3000 });

      expect(prisma.financialGoal.upsert).toHaveBeenCalledWith({
        where: { providerId_month: { providerId: 'provider1', month: '2026-10' } },
        create: { providerId: 'provider1', month: '2026-10', targetAmount: 3000 },
        update: { targetAmount: 3000, reachedAt: null },
      });
    });
  });

  describe('findMine', () => {
    it('lista só as metas do prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.financialGoal.findMany.mockResolvedValue([{ id: 'goal1' }]);

      const result = await service.findMine('user1');

      expect(prisma.financialGoal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerId: 'provider1' } }),
      );
      expect(result).toEqual([{ id: 'goal1' }]);
    });
  });

  describe('remove', () => {
    it('lança NotFoundException se não houver meta para o mês informado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.financialGoal.findUnique.mockResolvedValue(null);

      await expect(service.remove('user1', '2026-10')).rejects.toThrow(NotFoundException);
    });

    it('remove a meta do mês com sucesso', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.financialGoal.findUnique.mockResolvedValue({ id: 'goal1', providerId: 'provider1', month: '2026-10' });
      prisma.financialGoal.delete.mockResolvedValue({ id: 'goal1' });

      await service.remove('user1', '2026-10');

      expect(prisma.financialGoal.delete).toHaveBeenCalledWith({ where: { id: 'goal1' } });
    });
  });
});
