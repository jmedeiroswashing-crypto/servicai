import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdentityStatus } from '../generated/prisma/enums.js';
import { ReviewIdentityDto } from './dto/review-identity.dto.js';
import { AiService } from '../ai/ai.service.js';

const SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  identityStatus: true,
  identityDocumentUrl: true,
  identityRejectionReason: true,
  identitySubmittedAt: true,
  identityReviewedAt: true,
  identityAutoDecision: true,
  identityAutoReason: true,
} as const;

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async submit(userId: string, documentUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        identityStatus: IdentityStatus.PENDENTE,
        identityDocumentUrl: documentUrl,
        identitySubmittedAt: new Date(),
        identityRejectionReason: null,
        identityReviewedAt: null,
        identityReviewedById: null,
        identityAutoDecision: false,
        identityAutoReason: null,
      },
      select: { ...SELECT_FIELDS, name: true },
    });

    // Checagem automática por IA roda aqui (não em background): em ambiente
    // serverless a função pode morrer logo após a resposta HTTP, então
    // precisa terminar antes de devolver o resultado pro cliente.
    const analysis = await this.aiService
      .analyzeIdentityDocument(documentUrl, user.name)
      .catch((err: Error) => {
        this.logger.error('Falha inesperada na checagem automática de identidade', err);
        return { verdict: 'INCONCLUSIVO' as const, reason: 'Erro inesperado — aguardando revisão manual.' };
      });

    if (analysis.verdict === 'INCONCLUSIVO') {
      return this.prisma.user.update({
        where: { id: userId },
        data: { identityAutoReason: analysis.reason },
        select: SELECT_FIELDS,
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        identityStatus: analysis.verdict === 'APROVADO' ? IdentityStatus.APROVADO : IdentityStatus.REJEITADO,
        identityRejectionReason: analysis.verdict === 'REJEITADO' ? analysis.reason : null,
        identityAutoDecision: true,
        identityAutoReason: analysis.reason,
        identityReviewedAt: new Date(),
        identityReviewedById: null,
      },
      select: SELECT_FIELDS,
    });
  }

  async getMine(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: SELECT_FIELDS });
  }

  async getDocumentUrl(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { identityDocumentUrl: true } });
    return user?.identityDocumentUrl ?? null;
  }

  /**
   * Fila de revisão do admin: verificações realmente pendentes (IA
   * indisponível/inconclusiva) + as que a IA já decidiu sozinha mas nenhum
   * humano confirmou ainda (identityAutoDecision) — o admin pode reverter.
   */
  async listPending() {
    return this.prisma.user.findMany({
      where: { OR: [{ identityStatus: IdentityStatus.PENDENTE }, { identityAutoDecision: true }] },
      select: SELECT_FIELDS,
      orderBy: { identitySubmittedAt: 'asc' },
    });
  }

  async review(targetUserId: string, adminId: string, dto: ReviewIdentityDto) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.identityStatus === IdentityStatus.NAO_ENVIADO) {
      throw new BadRequestException('Este usuário ainda não enviou documento de identidade');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        identityStatus: dto.approve ? IdentityStatus.APROVADO : IdentityStatus.REJEITADO,
        identityRejectionReason: dto.approve ? null : (dto.rejectionReason ?? 'Documento não aceito'),
        identityReviewedAt: new Date(),
        identityReviewedById: adminId,
        // A partir daqui a decisão passa a ser humana, não mais da IA.
        identityAutoDecision: false,
      },
      select: SELECT_FIELDS,
    });
  }
}
