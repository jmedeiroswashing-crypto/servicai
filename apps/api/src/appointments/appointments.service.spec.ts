import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';

function buildService() {
  const prisma = {
    appointment: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
  };
  const providersService = { findByUserId: vi.fn() };
  const notificationsService = { create: vi.fn().mockResolvedValue(undefined) };
  const service = new AppointmentsService(prisma as never, providersService as never, notificationsService as never);
  return { service, prisma, providersService, notificationsService };
}

describe('AppointmentsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('cria o compromisso associado ao prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.appointment.create.mockResolvedValue({ id: 'a1' });

      await service.create('user1', { title: 'Visita ao cliente', scheduledAt: '2026-03-01T14:00:00.000Z' });

      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider1',
          title: 'Visita ao cliente',
          notes: undefined,
          scheduledAt: new Date('2026-03-01T14:00:00.000Z'),
        },
      });
    });

    it('rejeita data inválida', async () => {
      const { service, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });

      await expect(service.create('user1', { title: 'X', scheduledAt: 'data-invalida' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMine', () => {
    it('lista só os compromissos do prestador do usuário autenticado', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.appointment.findMany.mockResolvedValue([{ id: 'a1' }]);

      const result = await service.findMine('user1');

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { providerId: 'provider1' } }),
      );
      expect(result).toEqual([{ id: 'a1' }]);
    });
  });

  describe('remove', () => {
    it('lança NotFoundException se o compromisso não existir', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.remove('user1', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('rejeita remover compromisso de outro prestador', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.appointment.findUnique.mockResolvedValue({ id: 'a1', providerId: 'providerOther' });

      await expect(service.remove('user1', 'a1')).rejects.toThrow(ForbiddenException);
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });
  });

  describe('sendDueReminders', () => {
    it('não notifica nada quando não há compromissos na janela', async () => {
      const { service, prisma, notificationsService } = buildService();
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.sendDueReminders();

      expect(result).toEqual({ sent: 0 });
      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('notifica e marca notifiedAt para compromissos dentro da janela', async () => {
      const { service, prisma, notificationsService } = buildService();
      prisma.appointment.findMany.mockResolvedValue([
        { id: 'a1', title: 'Visita ao cliente', provider: { userId: 'providerUser1' } },
      ]);
      prisma.appointment.update.mockResolvedValue({ id: 'a1' });

      const result = await service.sendDueReminders();

      expect(result).toEqual({ sent: 1 });
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'providerUser1', type: 'LEMBRETE_COMPROMISSO', body: 'Visita ao cliente' }),
      );
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1' }, data: expect.objectContaining({ notifiedAt: expect.any(Date) }) }),
      );
    });

    it('só busca compromissos ainda não notificados', async () => {
      const { service, prisma } = buildService();
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.sendDueReminders();

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ notifiedAt: null }) }),
      );
    });
  });
});
