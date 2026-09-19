import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { RequestsService } from './requests.service.js';
import { AiService } from '../ai/ai.service.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { CreateProposalDto } from './dto/create-proposal.dto.js';
import { MatchFiltersDto } from './dto/match-filters.dto.js';
import { AiIntakeDto } from './dto/ai-intake.dto.js';
import { EstimatePriceDto } from './dto/estimate-price.dto.js';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(
    private requestsService: RequestsService,
    private aiService: AiService,
  ) {}

  @Post()
  @Roles(Role.CLIENTE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.userId, dto);
  }

  /**
   * Intake conversacional: em vez do formulário, o cliente descreve em texto
   * livre e a IA vai devolvendo o rascunho estruturado + a próxima pergunta.
   */
  @Post('ai-intake')
  @Roles(Role.CLIENTE)
  aiIntake(@Body() dto: AiIntakeDto) {
    return this.aiService.parseServiceRequestIntake(dto.message, dto.draft ?? {});
  }

  /**
   * Estimativa instantânea de preço para o cliente, mostrada antes de qualquer
   * prestador responder — diferencial contra plataformas onde o cliente só
   * descobre o preço depois de ser bombardeado de ligações para negociar.
   */
  @Post('estimate-price')
  @Roles(Role.CLIENTE)
  estimatePrice(@Body() dto: EstimatePriceDto) {
    return this.aiService.suggestPriceRange({ category: dto.category, description: dto.description ?? '', city: dto.city });
  }

  @Get('mine')
  @Roles(Role.CLIENTE)
  findMine(@CurrentUser() user: AuthUser) {
    return this.requestsService.findMineAsClient(user.userId);
  }

  @Get(':id/proposals')
  @Roles(Role.CLIENTE)
  listProposals(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requestsService.listProposalsForRequest(user.userId, id);
  }

  @Get('matches')
  @Roles(Role.PRESTADOR)
  findMatches(@CurrentUser() user: AuthUser, @Query() filters: MatchFiltersDto) {
    return this.requestsService.findMatchesForProvider(user.userId, filters);
  }

  @Get('my-proposals')
  @Roles(Role.PRESTADOR)
  listMyProposals(@CurrentUser() user: AuthUser) {
    return this.requestsService.listMyProposals(user.userId);
  }

  @Post(':id/proposals')
  @Roles(Role.PRESTADOR)
  createProposal(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateProposalDto) {
    return this.requestsService.createProposal(user.userId, id, dto);
  }

  @Post(':id/proposals/:proposalId/accept')
  @Roles(Role.CLIENTE)
  acceptProposal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.requestsService.acceptProposal(user.userId, id, proposalId);
  }
}
