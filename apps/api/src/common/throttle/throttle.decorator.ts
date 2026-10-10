import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'custom_throttle';

export interface ThrottleOptions {
  default: { ttl: number; limit: number };
}

/**
 * Substitui o @nestjs/throttler, que trava com ERR_REQUIRE_ESM em produção
 * na Vercel — seu código compilado ainda faz require() do @nestjs/common,
 * que é um pacote 100% ESM desde o Nest 12, sem versão CommonJS de
 * fallback. Mesma assinatura de uso (`{ default: { ttl, limit } }`), pra
 * não precisar mudar nenhum ponto de uso, só o import.
 */
export const Throttle = (options: ThrottleOptions) => SetMetadata(THROTTLE_KEY, options.default);
