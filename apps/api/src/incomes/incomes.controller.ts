import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { IncomesService } from './incomes.service.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';

@Controller('incomes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PRESTADOR)
export class IncomesController {
  constructor(private incomesService: IncomesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIncomeDto) {
    return this.incomesService.create(user.userId, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthUser) {
    return this.incomesService.findMine(user.userId);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.incomesService.remove(user.userId, id);
  }
}
