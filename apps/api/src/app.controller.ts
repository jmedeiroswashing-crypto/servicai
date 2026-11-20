import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Faz uma consulta real ao banco (não só responde 200) para funcionar como
   * keep-alive: o Supabase gratuito pausa o projeto após ~7 dias sem atividade
   * no banco, o que já derrubou a produção uma vez. Um Vercel Cron Job chama
   * esta rota diariamente (ver vercel.json) para evitar que isso se repita.
   */
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (err) {
      // Log explícito pra diagnosticar na Vercel em vez de só devolver um 500
      // genérico sem contexto — esse endpoint já existe só pra detectar isso.
      this.logger.error('Falha no health check (banco inacessível?)', err as Error);
      throw err;
    }
  }
}
