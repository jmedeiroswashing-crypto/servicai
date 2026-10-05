import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

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

  // CORS_ORIGIN aceita uma lista separada por vírgula (ex: para liberar o site E o
  // app nativo ao mesmo tempo). As origens do Capacitor (apps Android/iOS
  // empacotados com o site) são sempre liberadas, já que não são configuráveis
  // pelo usuário final e não têm risco de CSRF entre sites como um domínio público teria.
  const configuredOrigins = (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const capacitorOrigins = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

  app.enableCors({
    origin: [...new Set([...configuredOrigins, ...capacitorOrigins])],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = config.get<string>('PORT') ?? 3001;
  await app.listen(port);
}
await bootstrap();
