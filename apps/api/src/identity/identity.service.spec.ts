import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IdentityService } from './identity.service.js';
import { IdentityStatus } from '../generated/prisma/enums.js';

function buildService() {
  const prisma = {
    user: { update: vi.fn(), findUniqueOrThrow: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  };
  const service = new IdentityService(prisma as never);
  return { service, prisma };
}

describe('IdentityService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('submit', () => {
    it('salva a URL do documento (não mais um nome de arquivo local) e marca como pendente', async () => {
      const { service, prisma } = buildService();
      prisma.user.update.mockResolvedValue({ id: 'u1', identityStatus: IdentityStatus.PENDENTE });

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

    it('rejeita revisar quando não há verificação pendente', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ identityStatus: IdentityStatus.APROVADO });

      await expect(service.review('u1', 'admin1', { approve: true })).rejects.toThrow(BadRequestException);
    });

    it('aprova com sucesso', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ identityStatus: IdentityStatus.PENDENTE });
      prisma.user.update.mockResolvedValue({ identityStatus: IdentityStatus.APROVADO });

      await service.review('u1', 'admin1', { approve: true });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ identityStatus: IdentityStatus.APROVADO, identityRejectionReason: null }) }),
      );
    });
  });
});
