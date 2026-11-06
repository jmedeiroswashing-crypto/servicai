import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { urlDeExecucao } from './runtime-url.js';

// Cada instância serverless abre o próprio pool: ele precisa ser pequeno.
const adapter = new PrismaPg({ connectionString: urlDeExecucao(process.env.DATABASE_URL), max: 3 });

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
