import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportReason, ReportStatus, ReportTargetType } from '../generated/prisma/enums.js';

function buildService() {
  const prisma = {
    user: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    review: { findUnique: vi.fn() },
    service: { findUnique: vi.fn() },
    booking: { findUnique: vi.fn() },
    report: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  const service = new ReportsService(prisma as never);
  return { service, prisma };
}

describe('ReportsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('rejeita denúncia cujo alvo não existe', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('reporter1', { targetType: ReportTargetType.USUARIO, targetId: 'ghost', reason: ReportReason.SPAM }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.report.create).not.toHaveBeenCalled();
    });

    it('cria a denúncia quando o alvo (usuário) existe', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'target1' });
      prisma.report.create.mockResolvedValue({ id: 'r1' });

      const result = await service.create('reporter1', {
        targetType: ReportTargetType.USUARIO,
        targetId: 'target1',
        reason: ReportReason.GOLPE_FRAUDE,
        details: 'sumiu depois do pagamento',
      });

      expect(result).toEqual({ id: 'r1' });
      expect(prisma.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            reporterId: 'reporter1',
            targetType: ReportTargetType.USUARIO,
            targetId: 'target1',
            reason: ReportReason.GOLPE_FRAUDE,
            details: 'sumiu depois do pagamento',
          },
        }),
      );
    });

    it('valida o alvo contra a tabela certa por tipo (PRODUTO -> product)', async () => {
      const { service, prisma } = buildService();
      prisma.product.findUnique.mockResolvedValue({ id: 'prod1' });
      prisma.report.create.mockResolvedValue({ id: 'r2' });

      await service.create('reporter1', { targetType: ReportTargetType.PRODUTO, targetId: 'prod1', reason: ReportReason.SPAM });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 'prod1' }, select: { id: true } });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    describe('disputa de reserva (RESERVA)', () => {
      it('rejeita quando quem denuncia não faz parte da reserva', async () => {
        const { service, prisma } = buildService();
        prisma.booking.findUnique.mockResolvedValue({ clientId: 'client1', provider: { userId: 'providerUser1' } });

        await expect(
          service.create('outsider', { targetType: ReportTargetType.RESERVA, targetId: 'booking1', reason: ReportReason.SERVICO_NAO_CONFORME }),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.report.create).not.toHaveBeenCalled();
      });

      it('rejeita abrir uma segunda disputa enquanto a primeira está aberta', async () => {
        const { service, prisma } = buildService();
        prisma.booking.findUnique.mockResolvedValue({ clientId: 'client1', provider: { userId: 'providerUser1' } });
        prisma.report.findFirst.mockResolvedValue({ id: 'existing-open-report' });

        await expect(
          service.create('client1', { targetType: ReportTargetType.RESERVA, targetId: 'booking1', reason: ReportReason.SERVICO_NAO_CONFORME }),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.report.create).not.toHaveBeenCalled();
      });

      it('permite ao prestador abrir disputa sobre sua própria reserva', async () => {
        const { service, prisma } = buildService();
        prisma.booking.findUnique.mockResolvedValue({ clientId: 'client1', provider: { userId: 'providerUser1' } });
        prisma.report.findFirst.mockResolvedValue(null);
        prisma.report.create.mockResolvedValue({ id: 'r3' });

        await service.create('providerUser1', {
          targetType: ReportTargetType.RESERVA,
          targetId: 'booking1',
          reason: ReportReason.SERVICO_NAO_CONFORME,
        });

        expect(prisma.report.create).toHaveBeenCalled();
      });
    });
  });

  describe('resolve', () => {
    it('lança NotFoundException se a denúncia não existir', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.resolve('missing', 'admin1', { status: ReportStatus.RESOLVIDO })).rejects.toThrow(NotFoundException);
    });

    it('rejeita tentativa de voltar o status para PENDENTE', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue({ id: 'r1', status: ReportStatus.EM_ANALISE });

      await expect(service.resolve('r1', 'admin1', { status: ReportStatus.PENDENTE })).rejects.toThrow(BadRequestException);
      expect(prisma.report.update).not.toHaveBeenCalled();
    });

    it('marca como resolvido com o admin e a data corretos', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue({ id: 'r1', status: ReportStatus.PENDENTE });
      prisma.report.update.mockResolvedValue({ id: 'r1', status: ReportStatus.RESOLVIDO });

      await service.resolve('r1', 'admin1', { status: ReportStatus.RESOLVIDO, resolutionNote: 'ok' });

      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: expect.objectContaining({
            status: ReportStatus.RESOLVIDO,
            resolutionNote: 'ok',
            resolvedById: 'admin1',
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getForBooking', () => {
    it('lança NotFoundException se a reserva não existir', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.getForBooking('ghost', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('rejeita quem não faz parte da reserva', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ clientId: 'client1', provider: { userId: 'providerUser1' } });

      await expect(service.getForBooking('booking1', 'outsider')).rejects.toThrow(ForbiddenException);
    });

    it('retorna as disputas para quem faz parte da reserva', async () => {
      const { service, prisma } = buildService();
      prisma.booking.findUnique.mockResolvedValue({ clientId: 'client1', provider: { userId: 'providerUser1' } });
      prisma.report.findMany.mockResolvedValue([{ id: 'r1' }]);

      const result = await service.getForBooking('booking1', 'client1');

      expect(result).toEqual([{ id: 'r1' }]);
    });
  });

  describe('respond', () => {
    it('lança NotFoundException se a disputa não existir', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.respond('missing', 'user1', { statement: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('rejeita responder a uma denúncia que não é do tipo RESERVA', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue({ id: 'r1', targetType: ReportTargetType.USUARIO, status: ReportStatus.PENDENTE });

      await expect(service.respond('r1', 'user1', { statement: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('rejeita quem abriu a disputa tentando responder a ela mesma', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: ReportTargetType.RESERVA,
        status: ReportStatus.PENDENTE,
        reporterId: 'client1',
        respondentId: null,
        targetId: 'booking1',
      });

      await expect(service.respond('r1', 'client1', { statement: 'x' })).rejects.toThrow(ForbiddenException);
    });

    it('rejeita uma segunda resposta à mesma disputa', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: ReportTargetType.RESERVA,
        status: ReportStatus.PENDENTE,
        reporterId: 'client1',
        respondentId: 'providerUser1',
        targetId: 'booking1',
      });

      await expect(service.respond('r1', 'providerUser1', { statement: 'outra resposta' })).rejects.toThrow(BadRequestException);
    });

    it('permite à outra parte responder e move o status para EM_ANALISE', async () => {
      const { service, prisma } = buildService();
      prisma.report.findUnique.mockResolvedValue({
        id: 'r1',
        targetType: ReportTargetType.RESERVA,
        status: ReportStatus.PENDENTE,
        reporterId: 'client1',
        respondentId: null,
        targetId: 'booking1',
      });
      prisma.booking.findUnique.mockResolvedValue({ clientId: 'client1', provider: { userId: 'providerUser1' } });
      prisma.report.update.mockResolvedValue({ id: 'r1', status: ReportStatus.EM_ANALISE });

      await service.respond('r1', 'providerUser1', { statement: 'o cliente não estava em casa' });

      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: expect.objectContaining({
            respondentId: 'providerUser1',
            respondentStatement: 'o cliente não estava em casa',
            status: ReportStatus.EM_ANALISE,
          }),
        }),
      );
    });
  });
});
