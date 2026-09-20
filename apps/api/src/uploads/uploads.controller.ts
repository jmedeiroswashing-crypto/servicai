import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const UPLOAD_DIR = 'uploads';
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

mkdirSync(UPLOAD_DIR, { recursive: true });

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  /**
   * Upload real de imagem (avatar, portfólio, fotos de produto do marketplace) —
   * substitui o padrão anterior de "cole uma URL", que exigia a pessoa já ter a
   * foto hospedada em outro lugar. Arquivo fica em disco local: só funciona de
   * verdade com o backend rodando num host com filesystem persistente.
   */
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('Formato de imagem não suportado (use JPEG, PNG, WEBP ou GIF)'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return { url: `/uploads/${file.filename}` };
  }
}
