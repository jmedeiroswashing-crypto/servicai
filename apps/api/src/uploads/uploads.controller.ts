import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '../common/throttle/throttle.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { uploadBuffer } from '../common/blob-storage.js';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  /**
   * Upload real de imagem (avatar, portfólio) — substitui o padrão anterior
   * de "cole uma URL", que exigia a pessoa já ter a foto hospedada em outro
   * lugar. Vai pro Vercel Blob (ver common/blob-storage.ts) em vez de disco
   * local, que é efêmero em serverless.
   */
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
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
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    const pathname = `uploads/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const blob = await uploadBuffer(pathname, file.buffer, file.mimetype);
    return { url: blob.url };
  }
}
