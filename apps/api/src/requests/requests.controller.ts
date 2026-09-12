import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { RequestsService } from './requests.service.js';
import { CreateRequestDto } from './dto/create-request.dto.js';
import { CreateProposalDto } from './dto/create-proposal.dto.js';
import { MatchFiltersDto } from './dto/match-filters.dto.js';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  @Post()
  @Roles(Role.CLIENTE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.userId, dto);
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
}
