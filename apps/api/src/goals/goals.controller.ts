import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { GoalsService } from './goals.service.js';
import { UpsertGoalDto } from './dto/upsert-goal.dto.js';

@Controller('goals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PRESTADOR)
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Post()
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertGoalDto) {
    return this.goalsService.upsert(user.userId, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.goalsService.findMine(user.userId);
  }

  @Delete(':month')
  remove(@CurrentUser() user: AuthUser, @Param('month') month: string) {
    return this.goalsService.remove(user.userId, month);
  }
}
