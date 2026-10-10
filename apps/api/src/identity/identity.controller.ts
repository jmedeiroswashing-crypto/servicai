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
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { IdentityService } from './identity.service.js';
import { ReviewIdentityDto } from './dto/review-identity.dto.js';
import { safeDiskDestination } from '../common/safe-disk-destination.js';

const IDENTITY_UPLOAD_DIR = 'uploads-private/identity';
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

/**
 * Documento de identidade NUNCA passa pelo /uploads genérico (servido publicamente
 * via static assets): fica numa pasta própria, fora do static serving, e só é
 * acessível pelo dono do documento ou por um ADMIN, através de /identity/document/:userId.
 * Dado sensível (LGPD) não pode depender só de um nome de arquivo difícil de adivinhar.
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
      storage: diskStorage({
        destination: safeDiskDestination(IDENTITY_UPLOAD_DIR),
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
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
  submit(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return this.identityService.submit(user.userId, file.filename);
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
    const filename = await this.identityService.getDocumentFilename(userId);
    if (!filename) throw new NotFoundException('Nenhum documento enviado por este usuário');

    const filePath = join(process.cwd(), IDENTITY_UPLOAD_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException('Arquivo não encontrado');
    res.sendFile(filePath);
  }
}
