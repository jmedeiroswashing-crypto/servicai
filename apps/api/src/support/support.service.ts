import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { CreateSupportMessageDto } from './dto/create-support-message.dto.js';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  async send(userId: string, dto: CreateSupportMessageDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
    const destination = this.config.get<string>('SUPPORT_EMAIL') ?? 'suporte@servicai.app';

    await this.emailService.send(
      destination,
      `[Suporte ServiçAi] ${dto.subject}`,
      `<p>Mensagem de ${user.name} (${user.email}):</p><p>${dto.message.replace(/\n/g, '<br>')}</p>`,
      `De: ${user.name} <${user.email}>\nAssunto: ${dto.subject}\n\n${dto.message}`,
    );

    return { success: true };
  }
}
