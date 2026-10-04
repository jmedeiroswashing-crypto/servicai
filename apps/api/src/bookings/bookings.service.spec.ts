import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { BookingStatus } from '../generated/prisma/enums.js';

function buildService() {
  const prisma = {
    booking: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    service: { findUnique: vi.fn() },
    providerProfile: { findUnique: vi.fn() },
  };
  const providersService = {
    assertOwnership: vi.fn(),
    findByUserId: vi.fn(),
  };
  const service = new BookingsService(prisma as never, providersService as never);
  return { service, prisma, providersService };
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
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('rejeita qualquer transição a partir de um status terminal (CONCLUIDO)', async () => {
      const { service, prisma, providersService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', providerId: 'providerA', status: BookingStatus.CONCLUIDO });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });

      await expect(service.updateStatusAsProvider('user1', 'b1', BookingStatus.CANCELADO)).rejects.toThrow(BadRequestException);
    });

    it('permite a transição válida SOLICITADO -> ACEITO', async () => {
      const { service, prisma, providersService } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ id: 'b1', providerId: 'providerA', status: BookingStatus.SOLICITADO });
      providersService.assertOwnership.mockResolvedValue({ id: 'providerA' });
      prisma.booking.update.mockResolvedValue({ id: 'b1', status: BookingStatus.ACEITO });

      const result = await service.updateStatusAsProvider('user1', 'b1', BookingStatus.ACEITO);

      expect(result.status).toBe(BookingStatus.ACEITO);
      expect(prisma.booking.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: BookingStatus.ACEITO } });
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
  });
});
