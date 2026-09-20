import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { ProvidersService } from './providers.service.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { ProviderAiIntakeDto } from './dto/provider-ai-intake.dto.js';
import { Throttle } from '@nestjs/throttler';
import { AiService } from '../ai/ai.service.js';

@Controller('providers')
export class ProvidersController {
  constructor(
    private providersService: ProvidersService,
    private aiService: AiService,
  ) {}

  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('availableNow') availableNow?: string,
  ) {
    return this.providersService.findAll({
      city,
      category,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      availableNow: availableNow === 'true',
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  findMe(@CurrentUser() user: AuthUser) {
    return this.providersService.findByUserId(user.userId);
  }

  /**
   * Versão completa do próprio perfil (mídia, serviços, avaliações, reputação)
   * para a aba "Meu Perfil" — endpoint novo e separado de /providers/me para não
   * mudar o formato de resposta que outras telas (painel, IA, edição) já usam.
   */
  @Get('me/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  findMeFull(@CurrentUser() user: AuthUser) {
    return this.providersService.findMyRichProfile(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProviderDto) {
    return this.providersService.update(user.userId, dto);
  }

  /**
   * Liga/desliga o indicador "Disponível agora" — janela curta (ver
   * AVAILABILITY_WINDOW_HOURS), expira sozinha mesmo se o prestador esquecer
   * de desligar.
   */
  @Patch('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  setAvailability(@CurrentUser() user: AuthUser, @Body('available') available: boolean) {
    return this.providersService.setAvailability(user.userId, !!available);
  }

  /**
   * Intake conversacional: em vez do formulário, o prestador descreve em texto livre
   * e a IA vai devolvendo o rascunho do perfil + a próxima pergunta.
   */
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('ai-intake')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  aiIntake(@Body() dto: ProviderAiIntakeDto) {
    return this.aiService.parseProviderIntake(dto.message, dto.draft ?? {});
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
