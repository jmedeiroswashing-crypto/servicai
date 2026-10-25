import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterShopDto } from './dto/register-shop.dto.js';
import { LoginShopDto } from './dto/login-shop.dto.js';

@Injectable()
export class RepairAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private buildAuthResponse(shop: { id: string; email: string; name: string }) {
    const accessToken = this.jwt.sign({ sub: shop.id, email: shop.email, kind: 'repair-shop' });
    return { accessToken, shop: { id: shop.id, email: shop.email, name: shop.name } };
  }

  async register(dto: RegisterShopDto) {
    const existing = await this.prisma.repairShop.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const shop = await this.prisma.repairShop.create({
      data: { name: dto.name, email: dto.email, passwordHash, phone: dto.phone },
    });

    return this.buildAuthResponse(shop);
  }

  async login(dto: LoginShopDto) {
    const shop = await this.prisma.repairShop.findUnique({ where: { email: dto.email } });
    if (!shop) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, shop.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.buildAuthResponse(shop);
  }
}
