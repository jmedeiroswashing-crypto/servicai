import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { MediaService } from './media.service.js';
import { CreateMediaDto } from './dto/create-media.dto.js';

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMediaDto) {
    return this.mediaService.create(user.userId, dto);
  }

  @Get('provider/:providerId')
  findForProvider(@Param('providerId') providerId: string) {
    return this.mediaService.findForProvider(providerId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediaService.remove(user.userId, id);
  }
}
