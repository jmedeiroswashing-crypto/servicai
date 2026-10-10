import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLE_KEY } from './throttle.decorator.js';

interface Bucket {
  count: number;
  resetAt: number;
}

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_LIMIT = 120;
const SWEEP_EVERY_N_REQUESTS = 500;

/**
 * Rate limiter próprio em memória (janela fixa por IP+rota). Substitui o
 * @nestjs/throttler — ver throttle.decorator.ts para o motivo. Em memória
 * funciona bem para o padrão de deploy atual (uma instância por vez); se um
 * dia isso escalar para múltiplas instâncias simultâneas, precisaria virar
 * um contador compartilhado (Redis), mas isso é problema de outro dia.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly hits = new Map<string, Bucket>();
  private requestsSinceSweep = 0;

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const override = this.reflector.getAllAndOverride<{ ttl: number; limit: number }>(THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const ttl = override?.ttl ?? DEFAULT_TTL_MS;
    const limit = override?.limit ?? DEFAULT_LIMIT;

    const req = context.switchToHttp().getRequest();
    const ip = req.ip ?? 'unknown';
    const routeKey = req.route?.path ?? req.url;
    const key = `${ip}:${req.method}:${routeKey}`;

    const now = Date.now();
    this.maybeSweep(now);

    const bucket = this.hits.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + ttl });
      return true;
    }

    if (bucket.count >= limit) {
      throw new HttpException('Muitas requisições. Tente novamente em instantes.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return true;
  }

  private maybeSweep(now: number) {
    this.requestsSinceSweep += 1;
    if (this.requestsSinceSweep < SWEEP_EVERY_N_REQUESTS) return;
    this.requestsSinceSweep = 0;

    for (const [key, bucket] of this.hits) {
      if (bucket.resetAt <= now) this.hits.delete(key);
    }
  }
}
