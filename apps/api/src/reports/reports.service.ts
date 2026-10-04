import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportStatus, ReportTargetType } from '../generated/prisma/enums.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ResolveReportDto } from './dto/resolve-report.dto.js';
import { ReportFiltersDto } from './dto/report-filters.dto.js';
import { RespondReportDto } from './dto/respond-report.dto.js';

const REPORT_INCLUDE = {
  reporter: { select: { id: true, name: true, email: true } },
  resolvedBy: { select: { id: true, name: true } },
  respondent: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async getBookingParties(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { provider: { select: { userId: true } } },
    });
    if (!booking) return null;
    return { clientId: booking.clientId, providerUserId: booking.provider.userId };
  }

  async create(reporterId: string, dto: CreateReportDto) {
    await this.validateTarget(dto.targetType, dto.targetId, reporterId);

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
      include: REPORT_INCLUDE,
    });
  }

  private async validateTarget(targetType: ReportTargetType, targetId: string, reporterId: string) {
    let exists = false;
    switch (targetType) {
      case ReportTargetType.USUARIO:
        exists = !!(await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }));
        break;
      case ReportTargetType.PRODUTO:
        exists = !!(await this.prisma.product.findUnique({ where: { id: targetId }, select: { id: true } }));
        break;
      case ReportTargetType.AVALIACAO:
        exists = !!(await this.prisma.review.findUnique({ where: { id: targetId }, select: { id: true } }));
        break;
      case ReportTargetType.SERVICO:
        exists = !!(await this.prisma.service.findUnique({ where: { id: targetId }, select: { id: true } }));
        break;
      case ReportTargetType.RESERVA: {
        const parties = await this.getBookingParties(targetId);
        if (!parties) break;
        if (parties.clientId !== reporterId && parties.providerUserId !== reporterId) {
          throw new ForbiddenException('Você não faz parte desta reserva');
        }
        const openExisting = await this.prisma.report.findFirst({
          where: {
            targetType: ReportTargetType.RESERVA,
            targetId,
            status: { in: [ReportStatus.PENDENTE, ReportStatus.EM_ANALISE] },
          },
        });
        if (openExisting) throw new BadRequestException('Já existe uma disputa em aberto para esta reserva');
        exists = true;
        break;
      }
    }
    if (!exists) throw new BadRequestException('O conteúdo denunciado não foi encontrado');
  }

  async listAll(filters: ReportFiltersDto) {
    return this.prisma.report.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: string, adminId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Denúncia não encontrada');
    if (dto.status === ReportStatus.PENDENTE) {
      throw new BadRequestException('Não é possível voltar uma denúncia para pendente por aqui');
    }

    return this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
      include: REPORT_INCLUDE,
    });
  }

  /**
   * Disputas formais de reserva são vistas pelas duas partes envolvidas (cliente e
   * prestador), diferente de uma denúncia comum que só o denunciante e o ADMIN veem.
   */
  async getForBooking(bookingId: string, userId: string) {
    const parties = await this.getBookingParties(bookingId);
    if (!parties) throw new NotFoundException('Reserva não encontrada');
    if (parties.clientId !== userId && parties.providerUserId !== userId) {
      throw new ForbiddenException('Você não faz parte desta reserva');
    }

    return this.prisma.report.findMany({
      where: { targetType: ReportTargetType.RESERVA, targetId: bookingId },
      include: REPORT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Só a outra parte da reserva (não quem abriu a disputa) pode responder, e só uma
   * vez — isso é o que torna a disputa "formal" em vez de uma denúncia unilateral.
   */
  async respond(reportId: string, userId: string, dto: RespondReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Disputa não encontrada');
    if (report.targetType !== ReportTargetType.RESERVA) {
      throw new BadRequestException('Só é possível responder a disputas de reserva');
    }
    if (report.status === ReportStatus.RESOLVIDO || report.status === ReportStatus.REJEITADO) {
      throw new BadRequestException('Esta disputa já foi encerrada');
    }
    if (report.respondentId) throw new BadRequestException('Esta disputa já tem uma resposta');
    if (report.reporterId === userId) throw new ForbiddenException('Quem abriu a disputa não pode respondê-la');

    const parties = await this.getBookingParties(report.targetId);
    if (!parties || (parties.clientId !== userId && parties.providerUserId !== userId)) {
      throw new ForbiddenException('Você não faz parte desta reserva');
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        respondentId: userId,
        respondentStatement: dto.statement,
        respondedAt: new Date(),
        status: ReportStatus.EM_ANALISE,
      },
      include: REPORT_INCLUDE,
    });
  }
}
