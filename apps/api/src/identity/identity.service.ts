import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdentityStatus } from '../generated/prisma/enums.js';
import { ReviewIdentityDto } from './dto/review-identity.dto.js';

const SELECT_FIELDS = {
  id: true,
  name: true,
  email: true,
  identityStatus: true,
  identityDocumentUrl: true,
  identityRejectionReason: true,
  identitySubmittedAt: true,
  identityReviewedAt: true,
} as const;

@Injectable()
export class IdentityService {
  constructor(private prisma: PrismaService) {}

  async submit(userId: string, documentFilename: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        identityStatus: IdentityStatus.PENDENTE,
        identityDocumentUrl: documentFilename,
        identitySubmittedAt: new Date(),
        identityRejectionReason: null,
        identityReviewedAt: null,
        identityReviewedById: null,
      },
      select: SELECT_FIELDS,
    });
  }

  async getMine(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: SELECT_FIELDS });
  }

  async getDocumentFilename(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { identityDocumentUrl: true } });
    return user?.identityDocumentUrl ?? null;
  }

  async listPending() {
    return this.prisma.user.findMany({
      where: { identityStatus: IdentityStatus.PENDENTE },
      select: SELECT_FIELDS,
      orderBy: { identitySubmittedAt: 'asc' },
    });
  }

  async review(targetUserId: string, adminId: string, dto: ReviewIdentityDto) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.identityStatus !== IdentityStatus.PENDENTE) {
      throw new BadRequestException('Este usuário não tem uma verificação de identidade pendente');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        identityStatus: dto.approve ? IdentityStatus.APROVADO : IdentityStatus.REJEITADO,
        identityRejectionReason: dto.approve ? null : (dto.rejectionReason ?? 'Documento não aceito'),
        identityReviewedAt: new Date(),
        identityReviewedById: adminId,
      },
      select: SELECT_FIELDS,
    });
  }
}
