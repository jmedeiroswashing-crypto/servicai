import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestsService } from './requests.service.js';
import { RequestStatus } from '../generated/prisma/enums.js';

function buildService() {
  const prisma = {
    serviceRequest: { findUnique: vi.fn(), update: vi.fn() },
    proposal: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    booking: { create: vi.fn() },
    providerProfile: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  const subscriptionsService = {};
  const notificationsService = { create: vi.fn().mockResolvedValue(undefined) };
  const service = new RequestsService(prisma as never, subscriptionsService as never, notificationsService as never);
  return { service, prisma, notificationsService };
}

describe('RequestsService.acceptProposal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lança NotFoundException se a solicitação não existir', async () => {
    const { service, prisma } = buildService();
    prisma.serviceRequest.findUnique.mockResolvedValue(null);

    await expect(service.acceptProposal('client1', 'req1', 'prop1')).rejects.toThrow(NotFoundException);
  });

  it('rejeita cliente que não é dono da solicitação', async () => {
    const { service, prisma } = buildService();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'req1', clientId: 'otherClient', status: RequestStatus.ABERTA });

    await expect(service.acceptProposal('client1', 'req1', 'prop1')).rejects.toThrow(ForbiddenException);
  });

  it('rejeita aceitar proposta de solicitação já fechada', async () => {
    const { service, prisma } = buildService();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'req1', clientId: 'client1', status: RequestStatus.FECHADA });

    await expect(service.acceptProposal('client1', 'req1', 'prop1')).rejects.toThrow(BadRequestException);
  });

  it('rejeita proposta que não pertence à solicitação informada', async () => {
    const { service, prisma } = buildService();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'req1', clientId: 'client1', status: RequestStatus.ABERTA });
    prisma.proposal.findUnique.mockResolvedValue({ id: 'prop1', requestId: 'otherReq', status: 'ENVIADA' });

    await expect(service.acceptProposal('client1', 'req1', 'prop1')).rejects.toThrow(NotFoundException);
  });

  it('rejeita proposta que já foi aceita ou recusada antes', async () => {
    const { service, prisma } = buildService();
    prisma.serviceRequest.findUnique.mockResolvedValue({ id: 'req1', clientId: 'client1', status: RequestStatus.ABERTA });
    prisma.proposal.findUnique.mockResolvedValue({ id: 'prop1', requestId: 'req1', status: 'ACEITA' });

    await expect(service.acceptProposal('client1', 'req1', 'prop1')).rejects.toThrow(BadRequestException);
  });

  it('cria a reserva, recusa as demais propostas e fecha a solicitação ao aceitar', async () => {
    const { service, prisma, notificationsService } = buildService();
    prisma.serviceRequest.findUnique.mockResolvedValue({
      id: 'req1',
      clientId: 'client1',
      status: RequestStatus.ABERTA,
      title: 'Consertar vazamento',
      category: 'Encanador',
    });
    prisma.proposal.findUnique.mockResolvedValue({
      id: 'prop1',
      requestId: 'req1',
      providerId: 'provider1',
      price: 200,
      status: 'ENVIADA',
      availableAt: null,
      deadline: null,
    });
    const createdBooking = { id: 'booking1', status: 'ACEITO', priceQuoted: 200 };
    prisma.$transaction.mockResolvedValue([createdBooking, {}, {}, {}]);
    prisma.providerProfile.findUnique.mockResolvedValue({ id: 'provider1', userId: 'providerUser1' });

    const result = await service.acceptProposal('client1', 'req1', 'prop1');

    expect(result).toEqual(createdBooking);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'providerUser1', type: 'PROPOSTA_ACEITA' }),
    );
  });

  it('não falha se o prestador não for encontrado ao notificar (sem notificação, mas reserva criada)', async () => {
    const { service, prisma, notificationsService } = buildService();
    prisma.serviceRequest.findUnique.mockResolvedValue({
      id: 'req1',
      clientId: 'client1',
      status: RequestStatus.ABERTA,
      title: 'Pintura',
      category: 'Pintor',
    });
    prisma.proposal.findUnique.mockResolvedValue({
      id: 'prop1',
      requestId: 'req1',
      providerId: 'provider1',
      price: 300,
      status: 'ENVIADA',
      availableAt: 'amanhã',
      deadline: null,
    });
    const createdBooking = { id: 'booking1', status: 'ACEITO', priceQuoted: 300 };
    prisma.$transaction.mockResolvedValue([createdBooking, {}, {}, {}]);
    prisma.providerProfile.findUnique.mockResolvedValue(null);

    const result = await service.acceptProposal('client1', 'req1', 'prop1');

    expect(result).toEqual(createdBooking);
    expect(notificationsService.create).not.toHaveBeenCalled();
  });
});
