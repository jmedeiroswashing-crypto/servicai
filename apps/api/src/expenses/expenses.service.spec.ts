import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service.js';

function buildService() {
  const prisma = {
    expense: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  };
  const providersService = { findByUserId: vi.fn() };
  const service = new ExpensesService(prisma as never, providersService as never);
  return { service, prisma, providersService };
}

describe('ExpensesService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('cria a despesa associada ao prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.expense.create.mockResolvedValue({ id: 'e1' });

      await service.create('user1', { description: 'Tinta', category: 'Material/insumos', amount: 120 });

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: { providerId: 'provider1', description: 'Tinta', category: 'Material/insumos', amount: 120, date: undefined },
      });
    });

    it('usa a data informada quando fornecida', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.expense.create.mockResolvedValue({ id: 'e1' });

      await service.create('user1', { description: 'Combustível', category: 'Transporte', amount: 60, date: '2026-01-15' });

      const call = prisma.expense.create.mock.calls[0][0];
      expect(call.data.date).toBeInstanceOf(Date);
    });
  });

  describe('findMine', () => {
    it('lista só as despesas do prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.expense.findMany.mockResolvedValue([{ id: 'e1' }]);

      const result = await service.findMine('user1');

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerId: 'provider1' } }),
      );
      expect(result).toEqual([{ id: 'e1' }]);
    });
  });

  describe('remove', () => {
    it('lança NotFoundException se a despesa não existir', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.expense.findUnique.mockResolvedValue(null);

      await expect(service.remove('user1', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('rejeita remover despesa de outro prestador', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.expense.findUnique.mockResolvedValue({ id: 'e1', providerId: 'providerOther' });

      await expect(service.remove('user1', 'e1')).rejects.toThrow(ForbiddenException);
      expect(prisma.expense.delete).not.toHaveBeenCalled();
    });

    it('remove a própria despesa com sucesso', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.expense.findUnique.mockResolvedValue({ id: 'e1', providerId: 'provider1' });
      prisma.expense.delete.mockResolvedValue({ id: 'e1' });

      await service.remove('user1', 'e1');

      expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });
  });
});
