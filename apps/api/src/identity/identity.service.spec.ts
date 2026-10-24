import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IdentityService } from './identity.service.js';
import { IdentityStatus } from '../generated/prisma/enums.js';

function buildService() {
  const prisma = {
    user: { update: vi.fn(), findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  };
  const aiService = { analyzeIdentityDocument: vi.fn() };
  const service = new IdentityService(prisma as never, aiService as never);
  return { service, prisma, aiService };
}

describe('IdentityService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('submit', () => {
    it('salva a URL do documento e marca como pendente antes de checar com a IA', async () => {
      const { service, prisma, aiService } = buildService();
      prisma.user.update.mockResolvedValue({ id: 'u1', identityStatus: IdentityStatus.PENDENTE, name: 'Fulano' });
      aiService.analyzeIdentityDocument.mockResolvedValue({ verdict: 'INCONCLUSIVO', reason: 'x' });

      await service.submit('u1', 'https://blob.vercel-storage.com/identity/abc123.jpg');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({
            identityStatus: IdentityStatus.PENDENTE,
            identityDocumentUrl: 'https://blob.vercel-storage.com/identity/abc123.jpg',
          }),
        }),
      );
    });

    it('aprova automaticamente quando a IA confirma o documento', async () => {
      const { service, prisma, aiService } = buildService();
      prisma.user.update.mockResolvedValue({ id: 'u1', identityStatus: IdentityStatus.PENDENTE, name: 'Fulano' });
      aiService.analyzeIdentityDocument.mockResolvedValue({ verdict: 'APROVADO', reason: 'Documento ok' });

      await service.submit('u1', 'https://blob.vercel-storage.com/identity/abc123.jpg');

      expect(prisma.user.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identityStatus: IdentityStatus.APROVADO,
            identityAutoDecision: true,
            identityAutoReason: 'Documento ok',
            identityRejectionReason: null,
          }),
        }),
      );
    });

    it('rejeita automaticamente quando a IA reprova o documento', async () => {
      const { service, prisma, aiService } = buildService();
      prisma.user.update.mockResolvedValue({ id: 'u1', identityStatus: IdentityStatus.PENDENTE, name: 'Fulano' });
      aiService.analyzeIdentityDocument.mockResolvedValue({ verdict: 'REJEITADO', reason: 'Nome não confere' });

      await service.submit('u1', 'https://blob.vercel-storage.com/identity/abc123.jpg');

      expect(prisma.user.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identityStatus: IdentityStatus.REJEITADO,
            identityAutoDecision: true,
            identityRejectionReason: 'Nome não confere',
          }),
        }),
      );
    });

    it('mantém pendente (sem decidir) quando a IA é inconclusiva', async () => {
      const { service, prisma, aiService } = buildService();
      prisma.user.update.mockResolvedValue({ id: 'u1', identityStatus: IdentityStatus.PENDENTE, name: 'Fulano' });
      aiService.analyzeIdentityDocument.mockResolvedValue({ verdict: 'INCONCLUSIVO', reason: 'IA indisponível' });

      await service.submit('u1', 'https://blob.vercel-storage.com/identity/abc123.jpg');

      expect(prisma.user.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: { identityAutoReason: 'IA indisponível' },
        }),
      );
    });

    it('mantém pendente se a checagem por IA falhar inesperadamente', async () => {
      const { service, prisma, aiService } = buildService();
      prisma.user.update.mockResolvedValue({ id: 'u1', identityStatus: IdentityStatus.PENDENTE, name: 'Fulano' });
      aiService.analyzeIdentityDocument.mockRejectedValue(new Error('timeout'));

      await service.submit('u1', 'https://blob.vercel-storage.com/identity/abc123.jpg');

      expect(prisma.user.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ identityAutoReason: expect.any(String) }),
        }),
      );
      const lastCall = prisma.user.update.mock.calls.at(-1)?.[0];
      expect(lastCall.data.identityStatus).toBeUndefined();
    });
  });

  describe('getDocumentUrl', () => {
    it('retorna null se o usuário não tiver documento enviado', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ identityDocumentUrl: null });

      const result = await service.getDocumentUrl('u1');

      expect(result).toBeNull();
    });

    it('retorna a URL salva', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ identityDocumentUrl: 'https://blob.vercel-storage.com/identity/abc.jpg' });

      const result = await service.getDocumentUrl('u1');

      expect(result).toBe('https://blob.vercel-storage.com/identity/abc.jpg');
    });
  });

  describe('review', () => {
    it('lança NotFoundException se o usuário não existir', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.review('ghost', 'admin1', { approve: true })).rejects.toThrow(NotFoundException);
    });

    it('rejeita revisar quando nunca houve envio de documento', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ identityStatus: IdentityStatus.NAO_ENVIADO });

      await expect(service.review('u1', 'admin1', { approve: true })).rejects.toThrow(BadRequestException);
    });

    it('aprova com sucesso', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ identityStatus: IdentityStatus.PENDENTE });
      prisma.user.update.mockResolvedValue({ identityStatus: IdentityStatus.APROVADO });

      await service.review('u1', 'admin1', { approve: true });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identityStatus: IdentityStatus.APROVADO,
            identityRejectionReason: null,
            identityAutoDecision: false,
          }),
        }),
      );
    });

    it('permite o admin reverter uma decisão automática da IA', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ identityStatus: IdentityStatus.APROVADO, identityAutoDecision: true });
      prisma.user.update.mockResolvedValue({ identityStatus: IdentityStatus.REJEITADO });

      await service.review('u1', 'admin1', { approve: false, rejectionReason: 'Documento suspeito' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ identityStatus: IdentityStatus.REJEITADO, identityAutoDecision: false }),
        }),
      );
    });
  });
});
