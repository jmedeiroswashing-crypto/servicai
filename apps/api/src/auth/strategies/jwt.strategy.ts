import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthUser } from '../decorators/current-user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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

  async validate(payload: { sub: string; email: string; role: string; tokenVersion?: number }): Promise<AuthUser> {
    // Tokens antigos (emitidos antes desta checagem) não têm tokenVersion no
    // payload — tratamos como 0 pra não deslogar todo mundo de uma vez.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { deletedAt: true, tokenVersion: true },
    });

    if (!user || user.deletedAt) throw new UnauthorizedException('Sessão inválida');
    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
