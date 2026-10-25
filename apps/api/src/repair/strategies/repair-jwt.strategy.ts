import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthShop } from '../decorators/current-shop.decorator.js';

/**
 * Estratégia própria ('repair-jwt'), separada da 'jwt' usada pelo resto do
 * ServiçAi — um token de loja de conserto nunca é aceito pelas rotas comuns
 * (e vice-versa), mesmo reaproveitando o mesmo JWT_SECRET/JwtModule.
 */
@Injectable()
export class RepairJwtStrategy extends PassportStrategy(Strategy, 'repair-jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: string; email: string; kind: string }): Promise<AuthShop> {
    if (payload.kind !== 'repair-shop') throw new UnauthorizedException('Sessão inválida');

    const shop = await this.prisma.repairShop.findUnique({ where: { id: payload.sub }, select: { id: true } });
    if (!shop) throw new UnauthorizedException('Sessão inválida');

    return { shopId: payload.sub, email: payload.email };
  }
}
