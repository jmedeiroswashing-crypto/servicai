import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportReason, ReportStatus, ReportTargetType } from '../generated/prisma/enums.js';

function buildService() {
  const prisma = {
    user: { findUnique: vi.fn() },
    product: { findUnique: vi.fn() },
    review: { findUnique: vi.fn() },
    service: { findUnique: vi.fn() },
    report: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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
      expect(prisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'reporter1',
          targetType: ReportTargetType.USUARIO,
          targetId: 'target1',
          reason: ReportReason.GOLPE_FRAUDE,
          details: 'sumiu depois do pagamento',
        },
      });
    });

    it('valida o alvo contra a tabela certa por tipo (PRODUTO -> product)', async () => {
      const { service, prisma } = buildService();
      prisma.product.findUnique.mockResolvedValue({ id: 'prod1' });
      prisma.report.create.mockResolvedValue({ id: 'r2' });

      await service.create('reporter1', { targetType: ReportTargetType.PRODUTO, targetId: 'prod1', reason: ReportReason.SPAM });

      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 'prod1' }, select: { id: true } });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
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

      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({
          status: ReportStatus.RESOLVIDO,
          resolutionNote: 'ok',
          resolvedById: 'admin1',
          resolvedAt: expect.any(Date),
        }),
      });
    });
  });
});
