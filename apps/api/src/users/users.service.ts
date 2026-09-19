import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        city: true,
        addressState: true,
        bio: true,
        role: true,
        avatarUrl: true,
        verified: true,
        personType: true,
        razaoSocial: true,
        nomeFantasia: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        city: true,
        addressState: true,
        bio: true,
        role: true,
        avatarUrl: true,
        verified: true,
        personType: true,
        razaoSocial: true,
        nomeFantasia: true,
        createdAt: true,
      },
    });
  }

  /**
   * Exclusão de conta é "soft delete": marca deletedAt em vez de apagar a linha.
   * Um DELETE de verdade quebraria com violação de chave estrangeira sempre que
   * o usuário tiver histórico real (mensagens, reservas, avaliações escritas) —
   * essas relações não são cascade de propósito, para não sumir com o histórico
   * da OUTRA parte envolvida. O login passa a recusar contas com deletedAt.
   */
  async softDelete(id: string) {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
