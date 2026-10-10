import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IncomesService } from './incomes.service.js';

function buildService() {
  const prisma = {
    income: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  };
  const providersService = { findByUserId: vi.fn() };
  const service = new IncomesService(prisma as never, providersService as never);
  return { service, prisma, providersService };
}

describe('IncomesService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('cria a receita associada ao prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.income.create.mockResolvedValue({ id: 'i1' });

      await service.create('user1', { description: 'Serviço avulso', amount: 300 });

      expect(prisma.income.create).toHaveBeenCalledWith({
        data: { providerId: 'provider1', description: 'Serviço avulso', amount: 300, date: undefined },
      });
    });

    it('usa a data informada quando fornecida', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.income.create.mockResolvedValue({ id: 'i1' });

      await service.create('user1', { description: 'Serviço avulso', amount: 300, date: '2026-02-10' });

      const call = prisma.income.create.mock.calls[0][0];
      expect(call.data.date).toBeInstanceOf(Date);
    });
  });

  describe('findMine', () => {
    it('lista só as receitas do prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.income.findMany.mockResolvedValue([{ id: 'i1' }]);

      const result = await service.findMine('user1');

      expect(prisma.income.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { providerId: 'provider1' } }));
      expect(result).toEqual([{ id: 'i1' }]);
    });
  });

  describe('remove', () => {
    it('lança NotFoundException se a receita não existir', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.income.findUnique.mockResolvedValue(null);

      await expect(service.remove('user1', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('rejeita remover receita de outro prestador', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.income.findUnique.mockResolvedValue({ id: 'i1', providerId: 'providerOther' });

      await expect(service.remove('user1', 'i1')).rejects.toThrow(ForbiddenException);
      expect(prisma.income.delete).not.toHaveBeenCalled();
    });

    it('remove a própria receita com sucesso', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.income.findUnique.mockResolvedValue({ id: 'i1', providerId: 'provider1' });
      prisma.income.delete.mockResolvedValue({ id: 'i1' });

      await service.remove('user1', 'i1');

      expect(prisma.income.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
    });
  });
});
