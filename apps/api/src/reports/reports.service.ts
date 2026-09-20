import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportStatus, ReportTargetType } from '../generated/prisma/enums.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ResolveReportDto } from './dto/resolve-report.dto.js';
import { ReportFiltersDto } from './dto/report-filters.dto.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    await this.validateTarget(dto.targetType, dto.targetId);

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }

  private async validateTarget(targetType: ReportTargetType, targetId: string) {
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
    }
    if (!exists) throw new BadRequestException('O conteúdo denunciado não foi encontrado');
  }

  async listAll(filters: ReportFiltersDto) {
    return this.prisma.report.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true } },
      },
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
    });
  }
}
