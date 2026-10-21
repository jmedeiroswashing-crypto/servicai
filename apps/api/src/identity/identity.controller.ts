import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '../common/throttle/throttle.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { IdentityService } from './identity.service.js';
import { ReviewIdentityDto } from './dto/review-identity.dto.js';
import { uploadBuffer } from '../common/blob-storage.js';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Documento de identidade NUNCA passa pelo /uploads genérico nem é devolvido
 * como URL direta pro cliente: fica no Blob (que não tem bucket privado de
 * verdade), mas o app só devolve o conteúdo através de /identity/document/:userId,
 * que faz a checagem de dono-ou-ADMIN e busca o arquivo no servidor antes de
 * mandar pro cliente — a URL real do blob nunca é exposta. Dado sensível
 * (LGPD) não pode depender só de uma URL difícil de adivinhar.
 */
@Controller('identity')
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('submit')
  @UseGuards(RolesGuard)
  @Roles(Role.PRESTADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('Formato de imagem não suportado (use JPEG, PNG ou WEBP)'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async submit(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    const pathname = `identity/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const blob = await uploadBuffer(pathname, file.buffer, file.mimetype);
    return this.identityService.submit(user.userId, blob.url);
  }

  @Get('mine')
  getMine(@CurrentUser() user: AuthUser) {
    return this.identityService.getMine(user.userId);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listPending() {
    return this.identityService.listPending();
  }

  @Patch(':userId/review')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  review(@Param('userId') userId: string, @CurrentUser() admin: AuthUser, @Body() dto: ReviewIdentityDto) {
    return this.identityService.review(userId, admin.userId, dto);
  }

  @Get('document/:userId')
  async getDocument(@Param('userId') userId: string, @CurrentUser() requester: AuthUser, @Res() res: Response) {
    if (requester.userId !== userId && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Você não tem acesso a este documento');
    }
    const documentUrl = await this.identityService.getDocumentUrl(userId);
    if (!documentUrl) throw new NotFoundException('Nenhum documento enviado por este usuário');

    const blobRes = await fetch(documentUrl);
    if (!blobRes.ok || !blobRes.body) throw new NotFoundException('Arquivo não encontrado');
    res.setHeader('Content-Type', blobRes.headers.get('content-type') ?? 'application/octet-stream');
    const buffer = Buffer.from(await blobRes.arrayBuffer());
    res.send(buffer);
  }
}
