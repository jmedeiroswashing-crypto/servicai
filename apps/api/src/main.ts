import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { AppModule } from './app.module.js';
import { resolveCorsOrigins } from './common/cors-origins.js';

/**
 * ATENÇÃO: este bootstrap só roda em servidor tradicional (local, Railway, etc).
 * Em produção na Vercel, quem realmente executa é `api/index.mjs` — um ponto de
 * entrada serverless separado, com seu próprio bootstrap simplificado. Qualquer
 * mudança de CORS/config feita aqui precisa ser replicada manualmente lá também.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Confia no primeiro proxy na frente (Vercel/Railway/etc.) para que req.ip
  // reflita o IP real do cliente via X-Forwarded-For — sem isso, todo mundo
  // aparece com o mesmo IP (o do proxy) e o rate limiting por IP não funciona.
  app.set('trust proxy', 1);

  // Uploads ficam em disco local — só funciona com processo persistente (Railway,
  // Render, Fly.io, VPS). Em serverless (Vercel) o filesystem é efêmero e os
  // arquivos somem entre requisições.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableCors({
    origin: resolveCorsOrigins(config.get<string>('CORS_ORIGIN')),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = config.get<string>('PORT') ?? 3001;
  await app.listen(port);
}
await bootstrap();
