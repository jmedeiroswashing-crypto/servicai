import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { Throttle } from '../common/throttle/throttle.decorator.js';
import { ProvidersService } from '../providers/providers.service.js';
import { LeadsService } from './leads.service.js';
import { SearchLeadsDto } from './dto/search-leads.dto.js';
import { SaveLeadDto } from './dto/save-lead.dto.js';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PRESTADOR)
export class LeadsController {
  constructor(
    private leadsService: LeadsService,
    private providersService: ProvidersService,
  ) {}

  // Cada busca custa de verdade na API do Google — limite curto mesmo além
  // da cota mensal, pra não deixar um loop de cliques virar uma conta alta.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Get('search')
  async search(@CurrentUser() user: AuthUser, @Query() dto: SearchLeadsDto) {
    const provider = await this.providersService.findByUserId(user.userId);
    return this.leadsService.search(provider.id, dto);
  }

  @Get('saved')
  async listSaved(@CurrentUser() user: AuthUser) {
    const provider = await this.providersService.findByUserId(user.userId);
    return this.leadsService.listSaved(provider.id);
  }

  @Post('saved')
  async saveLead(@CurrentUser() user: AuthUser, @Body() dto: SaveLeadDto) {
    const provider = await this.providersService.findByUserId(user.userId);
    return this.leadsService.saveLead(provider.id, dto);
  }

  @Delete('saved/:id')
  async deleteSaved(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const provider = await this.providersService.findByUserId(user.userId);
    return this.leadsService.deleteSaved(provider.id, id);
  }
}
