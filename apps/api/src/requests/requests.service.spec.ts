import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestsService } from './requests.service.js';
import { RequestStatus } from '../generated/prisma/enums.js';

function buildService() {
  const tx = {
    serviceRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    proposal: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    booking: { create: vi.fn() },
  };
  const prisma = {
    serviceRequest: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    proposal: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    booking: { create: vi.fn() },
    providerProfile: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn(async (cb: (tx: typeof tx) => unknown) => cb(tx)),
  };
  const subscriptionsService = {};
  const notificationsService = { create: vi.fn().mockResolvedValue(undefined) };
  const service = new RequestsService(prisma as never, subscriptionsService as never, notificationsService as never);
  return { service, prisma, tx, notificationsService };
}

describe('RequestsService.create', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('notifica prestadores disponíveis agora cuja categoria combina com o pedido', async () => {
    const { service, prisma, notificationsService } = buildService();
    const created = { id: 'req1', clientId: 'client1', category: 'Encanador', title: 'Vazamento na pia' };
    prisma.serviceRequest.create.mockResolvedValue(created);
    prisma.providerProfile.findMany.mockResolvedValue([
      { userId: 'providerUser1', specialty: 'Encanador', categories: [] },
      { userId: 'providerUser2', specialty: 'Pintor', categories: ['Pintor'] },
    ]);

    await service.create('client1', { category: 'Encanador', title: 'Vazamento na pia', description: 'x', city: 'SP' });

    expect(notificationsService.create).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'providerUser1', type: 'NOVA_OPORTUNIDADE', body: 'Vazamento na pia' }),
    );
  });

  it('só busca prestadores com disponível agora ligado e ainda válido', async () => {
    const { service, prisma } = buildService();
    prisma.serviceRequest.create.mockResolvedValue({ id: 'req1', clientId: 'client1', category: 'Encanador', title: 'x' });

    await service.create('client1', { category: 'Encanador', title: 'x', description: 'y', city: 'SP' });

    expect(prisma.providerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { availableNow: true, availableUntil: { gt: expect.any(Date) } } }),
    );
  });

  it('não notifica nem a falha na notificação impede a criação do pedido', async () => {
    const { service, prisma, notificationsService } = buildService();
    const created = { id: 'req1', clientId: 'client1', category: 'Encanador', title: 'x' };
    prisma.serviceRequest.create.mockResolvedValue(created);
    prisma.providerProfile.findMany.mockRejectedValue(new Error('db down'));
    notificationsService.create.mockResolvedValue(undefined);

    const result = await service.create('client1', { category: 'Encanador', title: 'x', description: 'y', city: 'SP' });

    expect(result).toEqual(created);
  });
});

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
    const { service, prisma, tx, notificationsService } = buildService();
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
    tx.booking.create.mockResolvedValue(createdBooking);
    prisma.providerProfile.findUnique.mockResolvedValue({ id: 'provider1', userId: 'providerUser1' });

    const result = await service.acceptProposal('client1', 'req1', 'prop1');

    expect(result).toEqual(createdBooking);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.serviceRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'req1', status: RequestStatus.ABERTA },
      data: { status: RequestStatus.FECHADA },
    });
    expect(tx.proposal.updateMany).toHaveBeenCalledWith({
      where: { id: 'prop1', status: 'ENVIADA' },
      data: { status: 'ACEITA' },
    });
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'providerUser1', type: 'PROPOSTA_ACEITA' }),
    );
  });

  it('não falha se o prestador não for encontrado ao notificar (sem notificação, mas reserva criada)', async () => {
    const { service, prisma, tx, notificationsService } = buildService();
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
    tx.booking.create.mockResolvedValue(createdBooking);
    prisma.providerProfile.findUnique.mockResolvedValue(null);

    const result = await service.acceptProposal('client1', 'req1', 'prop1');

    expect(result).toEqual(createdBooking);
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('rejeita se a solicitação for fechada por outra aceitação concorrente antes da transação confirmar', async () => {
    const { service, prisma, tx } = buildService();
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
    // outra requisição venceu a corrida e já fechou a solicitação
    tx.serviceRequest.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.acceptProposal('client1', 'req1', 'prop1')).rejects.toThrow(BadRequestException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('rejeita se a proposta for confirmada por outra chamada concorrente antes da transação confirmar', async () => {
    const { service, prisma, tx } = buildService();
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
    tx.serviceRequest.updateMany.mockResolvedValue({ count: 1 });
    // outra chamada já tinha confirmado/recusado essa proposta
    tx.proposal.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.acceptProposal('client1', 'req1', 'prop1')).rejects.toThrow(BadRequestException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
});
