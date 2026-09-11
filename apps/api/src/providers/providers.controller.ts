import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { ProvidersService } from './providers.service.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';

@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.providersService.findAll({
      city,
      category,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  findMe(@CurrentUser() user: AuthUser) {
    return this.providersService.findByUserId(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProviderDto) {
    return this.providersService.update(user.userId, dto);
  }

  @Get('favorites/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE)
  findFavorites(@CurrentUser() user: AuthUser) {
    return this.providersService.findFavorites(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE)
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.providersService.favorite(user.userId, id);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENTE)
  unfavorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.providersService.unfavorite(user.userId, id);
  }
}
