import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { AppModule } from '../dist/app.module.js';
import { resolveCorsOrigins } from '../dist/common/cors-origins.js';

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

  app.enableCors({
    origin: resolveCorsOrigins(process.env.CORS_ORIGIN),
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
