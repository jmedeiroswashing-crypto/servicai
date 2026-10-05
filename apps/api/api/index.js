import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { AppModule } from '../dist/app.module.js';

const expressApp = express();
let ready;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Mantido em sincronia com main.ts (usado no servidor tradicional) — este arquivo
  // é o ponto de entrada real da Vercel (ver vercel.json), main.ts não é executado lá.
  const configuredOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const capacitorOrigins = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

  app.enableCors({
    origin: [...new Set([...configuredOrigins, ...capacitorOrigins])],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.init();
}

export default async function handler(req, res) {
  if (!ready) ready = bootstrap();
  await ready;
  expressApp(req, res);
}
