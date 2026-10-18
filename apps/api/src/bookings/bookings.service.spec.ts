import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingStatus } from '../generated/prisma/enums.js';

function buildService() {
  const tx = {
    booking: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    income: { create: vi.fn() },
  };
  const prisma = {
    booking: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    service: { findUnique: vi.fn() },
    providerProfile: { findUnique: vi.fn() },
    expense: { findMany: vi.fn().mockResolvedValue([]) },
    income: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    financialGoal: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: typeof tx) => unknown) => cb(tx)),
  };
  const providersService = {
    assertOwnership: vi.fn(),
    findByUserId: vi.fn(),
  };
  const notificationsService = { create: vi.fn().mockResolvedValue(undefined) };
  const service = new BookingsService(prisma as never, providersService as never, notificationsService as never);
  return { service, prisma, tx, providersService, notificationsService };
}

describe('BookingsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateStatusAsProvider', () => {
    it('rejeita reserva de outro prestador', async () => {
      const { service, prisma, providersService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', providerId: 'providerA', status: BookingStatus.SOLICITADO });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerB' });

      await expect(service.updateStatusAsProvider('user1', 'b1', BookingStatus.ACEITO)).rejects.toThrow(ForbiddenException);
    });

    it('rejeita transição inválida (SOLICITADO -> CONCLUIDO direto)', async () => {
      const { service, prisma, providersService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', providerId: 'providerA', status: BookingStatus.SOLICITADO });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });

      await expect(service.updateStatusAsProvider('user1', 'b1', BookingStatus.CONCLUIDO)).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita qualquer transição a partir de um status terminal (CONCLUIDO)', async () => {
      const { service, prisma, providersService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', providerId: 'providerA', status: BookingStatus.CONCLUIDO });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });

      await expect(service.updateStatusAsProvider('user1', 'b1', BookingStatus.CANCELADO)).rejects.toThrow(BadRequestException);
    });

    it('permite a transição válida SOLICITADO -> ACEITO', async () => {
      const { service, prisma, tx, providersService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', providerId: 'providerA', status: BookingStatus.SOLICITADO });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });

      const result = await service.updateStatusAsProvider('user1', 'b1', BookingStatus.ACEITO);

      expect(result.status).toBe(BookingStatus.ACEITO);
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', status: BookingStatus.SOLICITADO },
        data: { status: BookingStatus.ACEITO },
      });
      expect(tx.income.create).not.toHaveBeenCalled();
    });

    it('rejeita se a reserva já tiver sido alterada por outra chamada concorrente', async () => {
      const { service, prisma, tx, providersService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', providerId: 'providerA', status: BookingStatus.SOLICITADO });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });
      tx.booking.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.updateStatusAsProvider('user1', 'b1', BookingStatus.ACEITO)).rejects.toThrow(BadRequestException);
      expect(tx.income.create).not.toHaveBeenCalled();
    });

    it('ao concluir reserva com preço combinado, registra a venda como receita vinculada à reserva', async () => {
      const { service, prisma, tx, providersService, notificationsService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        providerId: 'providerA',
        clientId: 'client1',
        status: BookingStatus.EM_ANDAMENTO,
        priceQuoted: 150,
        category: 'Encanador',
      });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });
      tx.income.create.mockResolvedValue({ id: 'income1' });
      prisma.providerProfile.findUnique.mockResolvedValue({ id: 'providerA', userId: 'providerUser1' });

      const result = await service.updateStatusAsProvider('user1', 'b1', BookingStatus.CONCLUIDO);

      expect(result.status).toBe(BookingStatus.CONCLUIDO);
      expect(tx.income.create).toHaveBeenCalledWith({
        data: {
          providerId: 'providerA',
          description: 'Reserva concluída — Encanador',
          amount: 150,
          source: 'RESERVA',
          bookingId: 'b1',
        },
      });
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'providerUser1', type: 'VENDA_REGISTRADA' }),
      );
    });

    it('primeira venda do prestador gera mensagem de reconhecimento específica', async () => {
      const { service, prisma, tx, providersService, notificationsService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        providerId: 'providerA',
        clientId: 'client1',
        status: BookingStatus.EM_ANDAMENTO,
        priceQuoted: 150,
        category: 'Encanador',
      });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });
      tx.income.create.mockResolvedValue({ id: 'income1' });
      prisma.providerProfile.findUnique.mockResolvedValue({ id: 'providerA', userId: 'providerUser1' });
      prisma.income.count.mockResolvedValue(0);

      await service.updateStatusAsProvider('user1', 'b1', BookingStatus.CONCLUIDO);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('Primeira venda') }),
      );
    });

    it('cliente recorrente gera mensagem de reconhecimento específica', async () => {
      const { service, prisma, tx, providersService, notificationsService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        providerId: 'providerA',
        clientId: 'client1',
        status: BookingStatus.EM_ANDAMENTO,
        priceQuoted: 150,
        category: 'Encanador',
      });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });
      tx.income.create.mockResolvedValue({ id: 'income1' });
      prisma.providerProfile.findUnique.mockResolvedValue({ id: 'providerA', userId: 'providerUser1' });
      prisma.income.count.mockResolvedValue(3);
      prisma.booking.count.mockResolvedValue(2);

      await service.updateStatusAsProvider('user1', 'b1', BookingStatus.CONCLUIDO);

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('voltou a te contratar') }),
      );
    });

    it('não registra receita nem notifica se a reserva concluída não tiver preço combinado', async () => {
      const { service, prisma, tx, providersService, notificationsService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        providerId: 'providerA',
        clientId: 'client1',
        status: BookingStatus.EM_ANDAMENTO,
        priceQuoted: null,
      });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });

      await service.updateStatusAsProvider('user1', 'b1', BookingStatus.CONCLUIDO);

      expect(tx.income.create).not.toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('ao bater a meta do mês, notifica uma única vez e marca reachedAt', async () => {
      const { service, prisma, tx, providersService, notificationsService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        providerId: 'providerA',
        clientId: 'client1',
        status: BookingStatus.EM_ANDAMENTO,
        priceQuoted: 500,
        category: 'Encanador',
      });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });
      tx.income.create.mockResolvedValue({ id: 'income1' });
      prisma.providerProfile.findUnique.mockResolvedValue({ id: 'providerA', userId: 'providerUser1' });
      prisma.financialGoal.findUnique.mockResolvedValue({ id: 'goal1', targetAmount: 100, reachedAt: null });
      prisma.booking.findMany.mockResolvedValue([{ priceQuoted: 500 }]);
      prisma.expense.findMany.mockResolvedValue([]);
      prisma.income.findMany.mockResolvedValue([]);

      await service.updateStatusAsProvider('user1', 'b1', BookingStatus.CONCLUIDO);

      expect(prisma.financialGoal.update).toHaveBeenCalledWith({ where: { id: 'goal1' }, data: { reachedAt: expect.any(Date) } });
      expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'META_ATINGIDA' }));
    });

    it('não repete a notificação de meta já atingida no mesmo mês', async () => {
      const { service, prisma, tx, providersService, notificationsService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        providerId: 'providerA',
        clientId: 'client1',
        status: BookingStatus.EM_ANDAMENTO,
        priceQuoted: 500,
        category: 'Encanador',
      });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });
      tx.income.create.mockResolvedValue({ id: 'income1' });
      prisma.providerProfile.findUnique.mockResolvedValue({ id: 'providerA', userId: 'providerUser1' });
      prisma.financialGoal.findUnique.mockResolvedValue({ id: 'goal1', targetAmount: 100, reachedAt: new Date() });

      await service.updateStatusAsProvider('user1', 'b1', BookingStatus.CONCLUIDO);

      expect(prisma.financialGoal.update).not.toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'META_ATINGIDA' }));
    });
  });

  describe('cancelAsClient', () => {
    it('rejeita cancelar reserva de outro cliente', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', clientId: 'clientA', status: BookingStatus.SOLICITADO });

      await expect(service.cancelAsClient('clientB', 'b1')).rejects.toThrow(ForbiddenException);
    });

    it('rejeita cancelar uma reserva já concluída', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', clientId: 'clientA', status: BookingStatus.CONCLUIDO });

      await expect(service.cancelAsClient('clientA', 'b1')).rejects.toThrow(BadRequestException);
    });

    it('cancela uma reserva ativa do próprio cliente', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', clientId: 'clientA', status: BookingStatus.ACEITO });
      prisma.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.CANCELADO });

      const result = await service.cancelAsClient('clientA', 'b1');

      expect(result.status).toBe(BookingStatus.CANCELADO);
    });
  });

  describe('getEarnings', () => {
    it('soma apenas reservas CONCLUIDO com preço combinado, ignorando o resto', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.booking.findMany.mockResolvedValue([
        { priceQuoted: 100, updatedAt: new Date() },
        { priceQuoted: 50, updatedAt: new Date() },
      ]);

      const result = await service.getEarnings('user1');

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ providerId: 'provider1', status: BookingStatus.CONCLUIDO, priceQuoted: { not: null } }),
        }),
      );
      expect(result.totalAllTime).toBe(150);
      expect(result.totalServicesCompleted).toBe(2);
      expect(result.avgTicket).toBe(75);
    });

    it('retorna zeros quando não há nenhum serviço concluído ainda', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getEarnings('user1');

      expect(result.totalAllTime).toBe(0);
      expect(result.avgTicket).toBe(0);
      expect(result.months).toHaveLength(6);
    });

    it('calcula lucro líquido descontando despesas da receita, no mês atual e no total', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      const now = new Date();
      prisma.booking.findMany.mockResolvedValue([{ priceQuoted: 300, updatedAt: now }]);
      prisma.expense.findMany.mockResolvedValue([
        { amount: 50, date: now },
        { amount: 30, date: now },
      ]);

      const result = await service.getEarnings('user1');

      expect(result.totalExpensesAllTime).toBe(80);
      expect(result.netProfitAllTime).toBe(220);
      expect(result.currentMonthExpenses).toBe(80);
      expect(result.netProfitCurrentMonth).toBe(220);
    });

    it('não mistura despesas de outros meses no cálculo do mês atual', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      prisma.booking.findMany.mockResolvedValue([{ priceQuoted: 100, updatedAt: now }]);
      prisma.expense.findMany.mockResolvedValue([{ amount: 999, date: lastMonth }]);

      const result = await service.getEarnings('user1');

      expect(result.currentMonthExpenses).toBe(0);
      expect(result.netProfitCurrentMonth).toBe(100);
      expect(result.totalExpensesAllTime).toBe(999);
    });

    it('soma receita lançada manualmente à receita total, mas não ao ticket médio', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      const now = new Date();
      prisma.booking.findMany.mockResolvedValue([{ priceQuoted: 200, updatedAt: now }]);
      prisma.income.findMany.mockResolvedValue([{ amount: 150, date: now }]);

      const result = await service.getEarnings('user1');

      expect(result.currentMonthTotal).toBe(350);
      expect(result.totalAllTime).toBe(350);
      // ticket médio é só sobre reservas de verdade: 200 / 1 serviço, não 350 / 1
      expect(result.avgTicket).toBe(200);
      expect(result.totalServicesCompleted).toBe(1);
    });
  });

  describe('getClients', () => {
    it('agrupa reservas concluídas por cliente, somando total gasto e contagem', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      const older = new Date('2026-01-01');
      const newer = new Date('2026-02-01');
      prisma.booking.findMany.mockResolvedValue([
        { clientId: 'client1', priceQuoted: 100, updatedAt: older, client: { name: 'Ana', phone: '11999990000', avatarUrl: null } },
        { clientId: 'client1', priceQuoted: 200, updatedAt: newer, client: { name: 'Ana', phone: '11999990000', avatarUrl: null } },
        { clientId: 'client2', priceQuoted: 50, updatedAt: older, client: { name: 'Bruno', phone: null, avatarUrl: null } },
      ]);

      const result = await service.getClients('user1');

      expect(result).toEqual([
        { clientId: 'client1', name: 'Ana', phone: '11999990000', avatarUrl: null, totalSpent: 300, servicesCount: 2, lastServiceAt: newer },
        { clientId: 'client2', name: 'Bruno', phone: null, avatarUrl: null, totalSpent: 50, servicesCount: 1, lastServiceAt: older },
      ]);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerId: 'provider1', status: BookingStatus.CONCLUIDO } }),
      );
    });

    it('retorna lista vazia quando não há reservas concluídas', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getClients('user1');

      expect(result).toEqual([]);
    });
  });
});
