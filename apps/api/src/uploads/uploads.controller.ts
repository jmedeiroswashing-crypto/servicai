import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '../common/throttle/throttle.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const UPLOAD_DIR = 'uploads';
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Em serverless (Vercel) o filesystem é somente leitura fora de /tmp — criar essa
// pasta derruba o bootstrap inteiro do Nest se não for protegido. O upload em si já
// não funciona nesse ambiente (arquivo some entre requisições), mas o resto da API
// não pode cair por causa disso.
try {
  mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Filesystem somente leitura — upload de arquivo fica indisponível, mas a API continua de pé.
}

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
