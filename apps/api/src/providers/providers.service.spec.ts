import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProvidersService } from './providers.service.js';

function buildService() {
  const prisma = {
    providerProfile: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
  };
  const service = new ProvidersService(prisma as never);
  return { service, prisma };
}

describe('ProvidersService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('setBusinessMode', () => {
    it('lança NotFoundException se o usuário não tiver perfil de prestador', async () => {
      const { service, prisma } = buildService();
      prisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.setBusinessMode('user1', 'GESTAO')).rejects.toThrow(NotFoundException);
    });

    it('atualiza o businessMode do próprio perfil', async () => {
      const { service, prisma } = buildService();
      prisma.providerProfile.findUnique.mockResolvedValue({ id: 'provider1', availableNow: false, availableUntil: null });
      prisma.providerProfile.update.mockResolvedValue({ id: 'provider1', businessMode: 'COMPLETO' });

      await service.setBusinessMode('user1', 'COMPLETO');

      expect(prisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: 'provider1' },
        data: { businessMode: 'COMPLETO' },
      });
    });
  });

  describe('findAll', () => {
    it('exclui prestadores em modo "gestão apenas" da busca pública', async () => {
      const { service, prisma } = buildService();

      await service.findAll({});

      expect(prisma.providerProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: [{ businessMode: null }, { businessMode: 'COMPLETO' }] }),
        }),
      );
    });
  });
});
