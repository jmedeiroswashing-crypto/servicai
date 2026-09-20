import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  private get frontendUrl() {
    return this.config.get<string>('FRONTEND_URL') ?? this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    if (dto.cpf) {
      const cpfTaken = await this.prisma.user.findUnique({ where: { cpf: dto.cpf } });
      if (cpfTaken) throw new ConflictException('CPF já cadastrado');
    }
    if (dto.cnpj) {
      const cnpjTaken = await this.prisma.user.findUnique({ where: { cnpj: dto.cnpj } });
      if (cnpjTaken) throw new ConflictException('CNPJ já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        phone: dto.phone,
        city: dto.city,
        personType: dto.personType,
        cpf: dto.cpf,
        cnpj: dto.cnpj,
        razaoSocial: dto.razaoSocial,
        nomeFantasia: dto.nomeFantasia,
        addressCep: dto.addressCep,
        addressStreet: dto.addressStreet,
        addressNumber: dto.addressNumber,
        addressState: dto.addressState,
      },
    });

    if (dto.role === Role.PRESTADOR) {
      const provider = await this.prisma.providerProfile.create({
        data: {
          userId: user.id,
          specialty: 'A definir',
          city: dto.city ?? 'Não informado',
          categories: [],
        },
      });
      await this.prisma.subscription.create({ data: { providerId: provider.id } });
    }

    await this.issueEmailVerification(user.id, user.email, user.name);

    return this.buildAuthResponse(user.id, user.email, user.role, user.name);
  }

  private async issueEmailVerification(userId: string, email: string, name: string) {
    const token = randomBytes(32).toString('hex');
    const emailVerificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token, emailVerificationExpiresAt },
    });

    const link = `${this.frontendUrl}/verificar-email?token=${token}`;
    await this.emailService.send(
      email,
      'Confirme seu e-mail — ServiçAi',
      `<p>Olá, ${name}!</p><p>Confirme seu e-mail clicando no link abaixo:</p><p><a href="${link}">${link}</a></p><p>Este link expira em 48 horas.</p>`,
      `Confirme seu e-mail: ${link}`,
    );
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.verified) return { success: true, alreadyVerified: true };
    await this.issueEmailVerification(user.id, user.email, user.name);
    return { success: true, alreadyVerified: false };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { emailVerificationToken: dto.token } });
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Link de verificação inválido ou expirado');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verified: true, emailVerificationToken: null, emailVerificationExpiresAt: null },
    });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.deletedAt) return { success: true };

    const token = randomBytes(32).toString('hex');
    const passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiresAt },
    });

    const link = `${this.frontendUrl}/redefinir-senha?token=${token}`;
    await this.emailService.send(
      user.email,
      'Redefinição de senha — ServiçAi',
      `<p>Olá, ${user.name}!</p><p>Clique no link abaixo para redefinir sua senha:</p><p><a href="${link}">${link}</a></p><p>Este link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.</p>`,
      `Redefina sua senha: ${link}`,
    );

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: dto.token } });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Link de redefinição inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
    });

    return { success: true };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.deletedAt) throw new UnauthorizedException('Esta conta foi excluída');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.buildAuthResponse(user.id, user.email, user.role, user.name);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  }

  private buildAuthResponse(sub: string, email: string, role: Role, name: string) {
    const accessToken = this.jwt.sign({ sub, email, role });
    return {
      accessToken,
      user: { id: sub, email, role, name },
    };
  }
}
