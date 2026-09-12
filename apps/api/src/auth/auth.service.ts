import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

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

    return this.buildAuthResponse(user.id, user.email, user.role, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.buildAuthResponse(user.id, user.email, user.role, user.name);
  }

  private buildAuthResponse(sub: string, email: string, role: Role, name: string) {
    const accessToken = this.jwt.sign({ sub, email, role });
    return {
      accessToken,
      user: { id: sub, email, role, name },
    };
  }
}
