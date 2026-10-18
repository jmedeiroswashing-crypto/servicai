import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from './chat.service.js';

function buildService() {
  const prisma = {
    conversation: { upsert: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  };
  const providersService = { findOne: vi.fn(), findByUserId: vi.fn() };
  const notificationsService = { create: vi.fn().mockResolvedValue(undefined) };
  const service = new ChatService(prisma as never, providersService as never, notificationsService as never);
  return { service, prisma, providersService, notificationsService };
}

describe('ChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('startConversationAsProvider', () => {
    it('cria/reaproveita a conversa a partir do prestador, sem expor telefone do cliente', async () => {
      const { service, prisma, providersService } = buildService();
      providersService.findByUserId.mockResolvedValue({ id: 'provider1' });
      prisma.conversation.upsert.mockResolvedValue({ id: 'conv1', clientId: 'client1', providerId: 'provider1' });

      const result = await service.startConversationAsProvider('user1', 'client1');

      expect(result).toEqual({ id: 'conv1', clientId: 'client1', providerId: 'provider1' });
      expect(prisma.conversation.upsert).toHaveBeenCalledWith({
        where: { clientId_providerId: { clientId: 'client1', providerId: 'provider1' } },
        create: { clientId: 'client1', providerId: 'provider1' },
        update: {},
        include: { client: { select: { name: true, avatarUrl: true } } },
      });
    });
  });
});
