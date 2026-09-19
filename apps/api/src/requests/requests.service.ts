import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RequestStatus, NotificationType } from '../generated/prisma/enums.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { getEffectivePlan } from '../subscriptions/subscription-state.js';
import { getPlanConfig } from '../subscriptions/plans.config.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { CreateProposalDto } from './dto/create-proposal.dto.js';
import { MatchFiltersDto } from './dto/match-filters.dto.js';

const TIME_UNITS: [number, string][] = [
  [60, 'minuto'],
  [60, 'hora'],
  [24, 'dia'],
  [7, 'semana'],
  [4.345, 'mês'],
  [12, 'ano'],
];

function timeAgo(date: Date): string {
  let diff = (Date.now() - date.getTime()) / 1000;
  let unit = 'segundo';
  for (const [factor, name] of TIME_UNITS) {
    if (diff < factor) break;
    diff /= factor;
    unit = name;
  }
  const value = Math.max(1, Math.round(diff));
  const plural = value > 1 ? (unit === 'mês' ? 'meses' : `${unit}s`) : unit;
  return `há ${value} ${plural}`;
}

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(clientId: string, dto: CreateRequestDto) {
    return this.prisma.serviceRequest.create({
      data: {
        clientId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        city: dto.city,
        state: dto.state,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        desiredDate: dto.desiredDate ? new Date(dto.desiredDate) : undefined,
        desiredTime: dto.desiredTime,
      },
    });
  }

  async findMineAsClient(clientId: string) {
    const requests = await this.prisma.serviceRequest.findMany({
      where: { clientId },
      include: { _count: { select: { proposals: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => ({ ...r, proposalsCount: r._count.proposals }));
  }

  /**
   * O cliente vê todas as propostas — planos pagos não escondem concorrentes
   * uns dos outros — mas quem tem plano superior aparece primeiro, como parte
   * do valor comercial do plano. Dentro do mesmo plano, desempata por nota e
   * depois por mais recente.
   */
  async listProposalsForRequest(clientId: string, requestId: string) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.clientId !== clientId) throw new ForbiddenException('Esta solicitação não é sua');

    const proposals = await this.prisma.proposal.findMany({
      where: { requestId },
      include: {
        provider: {
          include: {
            user: { select: { name: true, avatarUrl: true, phone: true } },
            subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
          },
        },
      },
    });

    return proposals
      .map((p) => ({
        ...p,
        planWeight: p.provider.subscription
          ? getPlanConfig(getEffectivePlan(p.provider.subscription)).rankingWeight
          : 0,
      }))
      .sort(
        (a, b) =>
          b.planWeight - a.planWeight ||
          b.provider.ratingAvg - a.provider.ratingAvg ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Aceitar uma proposta é o que faltava para fechar o ciclo do mural de
   * oportunidades: sem isso, "proposta aceita" nunca virava um compromisso de
   * verdade em lugar nenhum do sistema. Cria uma reserva (Booking) real,
   * fecha a solicitação e recusa as demais propostas — só um prestador é
   * contratado por solicitação. `availableAt`/`deadline` da proposta são
   * texto livre (ex: "amanhã de manhã"), não uma data — por isso viram
   * observação da reserva em vez de um scheduledAt inventado.
   */
  async acceptProposal(clientId: string, requestId: string, proposalId: string) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.clientId !== clientId) throw new ForbiddenException('Esta solicitação não é sua');
    if (request.status !== RequestStatus.ABERTA) {
      throw new BadRequestException('Esta solicitação já foi fechada');
    }

    const proposal = await this.prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.requestId !== requestId) throw new NotFoundException('Proposta não encontrada');
    if (proposal.status !== 'ENVIADA') throw new BadRequestException('Esta proposta não está mais disponível');

    const notesParts = [request.title];
    if (proposal.availableAt) notesParts.push(`Disponibilidade combinada: ${proposal.availableAt}`);
    if (proposal.deadline) notesParts.push(`Prazo combinado: ${proposal.deadline}`);

    const [booking] = await this.prisma.$transaction([
      this.prisma.booking.create({
        data: {
          clientId,
          providerId: proposal.providerId,
          status: 'ACEITO',
          priceQuoted: proposal.price,
          notes: notesParts.join(' — '),
        },
      }),
      this.prisma.proposal.update({ where: { id: proposalId }, data: { status: 'ACEITA' } }),
      this.prisma.proposal.updateMany({
        where: { requestId, id: { not: proposalId } },
        data: { status: 'RECUSADA' },
      }),
      this.prisma.serviceRequest.update({ where: { id: requestId }, data: { status: RequestStatus.FECHADA } }),
    ]);

    const provider = await this.prisma.providerProfile.findUnique({ where: { id: proposal.providerId } });
    if (provider) {
      await this.notificationsService.create({
        userId: provider.userId,
        type: NotificationType.PROPOSTA_ACEITA,
        title: `Sua proposta para "${request.title}" foi aceita!`,
        body: `O cliente aceitou sua proposta de R$ ${proposal.price.toFixed(2).replace('.', ',')}. Confira na sua agenda.`,
        link: '/painel/agenda',
      });
    }

    return booking;
  }

  /**
   * Feed de oportunidades do prestador. Por privacidade, NUNCA inclui dados
   * pessoais do cliente (nome, telefone, e-mail, endereço exato) — apenas o
   * necessário para o prestador avaliar a oportunidade.
   */
  async findMatchesForProvider(userId: string, filters: MatchFiltersDto) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: { user: { select: { addressState: true } } },
    });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');

    const providerCategories = provider.categories.length > 0 ? provider.categories : [provider.specialty];
    const providerState = provider.user.addressState;

    const distance = filters.distance ?? 'todas';
    const locationFilter =
      distance === 'cidade'
        ? { city: { equals: provider.city, mode: 'insensitive' as const } }
        : distance === 'estado' && providerState
          ? { state: providerState }
          : {};

    const providerProposals = await this.prisma.proposal.findMany({
      where: { providerId: provider.id },
      select: { requestId: true },
    });
    const proposedRequestIds = new Set(providerProposals.map((p) => p.requestId));

    const requests = await this.prisma.serviceRequest.findMany({
      where: {
        status: RequestStatus.ABERTA,
        category: filters.category
          ? { equals: filters.category, mode: 'insensitive' }
          : { in: providerCategories, mode: 'insensitive' },
        ...locationFilter,
        ...(filters.budgetMin != null ? { budgetMax: { gte: filters.budgetMin } } : {}),
        ...(filters.budgetMax != null ? { budgetMin: { lte: filters.budgetMax } } : {}),
        ...(filters.dateFrom ? { desiredDate: { gte: new Date(filters.dateFrom) } } : {}),
        ...(filters.dateTo ? { desiredDate: { lte: new Date(filters.dateTo) } } : {}),
      },
      include: { _count: { select: { proposals: true } } },
      take: 100,
    });

    const enriched = requests.map((r) => {
      const sameCity = r.city.toLowerCase() === provider.city.toLowerCase();
      const sameState = !!providerState && r.state === providerState;
      const categoryExact = providerCategories.some((c) => c.toLowerCase() === r.category.toLowerCase());

      const matchScore =
        (categoryExact ? 50 : 25) + (sameCity ? 30 : sameState ? 15 : 0) + (r.budgetMin || r.budgetMax ? 5 : 0);

      return {
        id: r.id,
        category: r.category,
        title: r.title,
        description: r.description,
        city: r.city,
        state: r.state,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        desiredDate: r.desiredDate,
        desiredTime: r.desiredTime,
        createdAt: r.createdAt,
        publishedAgo: timeAgo(r.createdAt),
        proposalsCount: r._count.proposals,
        alreadyProposed: proposedRequestIds.has(r.id),
        proximityLabel: sameCity ? 'Na sua cidade' : sameState ? 'No seu estado' : 'Fora da sua região',
        matchScore,
      };
    });

    const sort = filters.sort ?? 'recentes';
    if (sort === 'match') {
      enriched.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sort === 'proximos') {
      const rank = (label: string) => (label === 'Na sua cidade' ? 0 : label === 'No seu estado' ? 1 : 2);
      enriched.sort((a, b) => rank(a.proximityLabel) - rank(b.proximityLabel));
    } else {
      enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return enriched;
  }

  async createProposal(userId: string, requestId: string, dto: CreateProposalDto) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');

    const request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Solicitação não encontrada');
    if (request.status !== RequestStatus.ABERTA) {
      throw new BadRequestException('Esta solicitação não está mais recebendo propostas');
    }

    const existing = await this.prisma.proposal.findUnique({
      where: { requestId_providerId: { requestId, providerId: provider.id } },
    });
    if (existing) throw new ConflictException('Você já enviou uma proposta para esta solicitação');

    await this.subscriptionsService.assertProposalLimit(provider.id);

    const proposal = await this.prisma.proposal.create({
      data: {
        requestId,
        providerId: provider.id,
        price: dto.price,
        message: dto.message,
        deadline: dto.deadline,
        availableAt: dto.availableAt,
      },
    });

    await this.subscriptionsService.consumeProposal(provider.id);

    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { id: provider.id },
      include: { user: { select: { name: true } } },
    });
    await this.notificationsService.create({
      userId: request.clientId,
      type: NotificationType.NOVA_PROPOSTA,
      title: `Nova proposta para "${request.title}"`,
      body: `${providerProfile?.user.name ?? 'Um prestador'} enviou uma proposta de R$ ${dto.price.toFixed(2).replace('.', ',')}.`,
      link: `/minhas-solicitacoes`,
    });

    return proposal;
  }

  async listMyProposals(userId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('Perfil de prestador não encontrado');

    return this.prisma.proposal.findMany({
      where: { providerId: provider.id },
      include: { request: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
