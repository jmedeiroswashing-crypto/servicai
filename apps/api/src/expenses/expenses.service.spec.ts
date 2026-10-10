import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service.js';

function buildService() {
  const prisma = {
    expense: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
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
        data: {
          providerId: 'provider1',
          description: 'Tinta',
          category: 'Material/insumos',
          amount: 120,
          date: undefined,
          isRecurring: false,
        },
      });
    });

    it('marca como recorrente quando solicitado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.expense.create.mockResolvedValue({ id: 'e1' });

      await service.create('user1', { description: 'Aluguel do ponto', category: 'Outro', amount: 500, isRecurring: true });

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRecurring: true }) }),
      );
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

  describe('generateRecurringExpenses', () => {
    it('não cria nada quando não há despesas recorrentes', async () => {
      const { service, prisma } = buildService();
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await service.generateRecurringExpenses();

      expect(result).toEqual({ created: 0 });
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('não gera cópia para o molde criado neste mesmo mês', async () => {
      const { service, prisma } = buildService();
      const now = new Date();
      prisma.expense.findMany.mockResolvedValue([
        { id: 'template1', providerId: 'provider1', description: 'Aluguel', category: 'Outro', amount: 500, date: now, isRecurring: true, recurringParentId: null },
      ]);

      const result = await service.generateRecurringExpenses();

      expect(result).toEqual({ created: 0 });
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('gera uma cópia para o mês atual quando o molde é de um mês anterior e ainda não tem cópia', async () => {
      const { service, prisma } = buildService();
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5);
      prisma.expense.findMany.mockResolvedValue([
        { id: 'template1', providerId: 'provider1', description: 'Aluguel', category: 'Outro', amount: 500, date: lastMonth, isRecurring: true, recurringParentId: null },
      ]);
      prisma.expense.findFirst.mockResolvedValue(null);
      prisma.expense.create.mockResolvedValue({ id: 'clone1' });

      const result = await service.generateRecurringExpenses();

      expect(result).toEqual({ created: 1 });
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'provider1',
          description: 'Aluguel',
          category: 'Outro',
          amount: 500,
          isRecurring: false,
          recurringParentId: 'template1',
        }),
      });
    });

    it('não duplica se já existe uma cópia desse mês pra esse molde', async () => {
      const { service, prisma } = buildService();
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5);
      prisma.expense.findMany.mockResolvedValue([
        { id: 'template1', providerId: 'provider1', description: 'Aluguel', category: 'Outro', amount: 500, date: lastMonth, isRecurring: true, recurringParentId: null },
      ]);
      prisma.expense.findFirst.mockResolvedValue({ id: 'already-cloned-this-month' });

      const result = await service.generateRecurringExpenses();

      expect(result).toEqual({ created: 0 });
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });
  });
});
