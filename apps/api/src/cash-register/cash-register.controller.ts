import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { CashRegisterService } from './cash-register.service.js';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto.js';
import { AddCashMovementDto } from './dto/add-cash-movement.dto.js';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto.js';

@Controller('cash-register')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PRESTADOR)
export class CashRegisterController {
  constructor(private cashRegisterService: CashRegisterService) {}

  @Get('today')
  today(@CurrentUser() user: AuthUser) {
    return this.cashRegisterService.today(user.userId);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.cashRegisterService.history(user.userId);
  }

  @Post('open')
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenCashRegisterDto) {
    return this.cashRegisterService.open(user.userId, dto);
  }

  @Post('movement')
  addMovement(@CurrentUser() user: AuthUser, @Body() dto: AddCashMovementDto) {
    return this.cashRegisterService.addMovement(user.userId, dto);
  }

  @Post('close')
  close(@CurrentUser() user: AuthUser, @Body() dto: CloseCashRegisterDto) {
    return this.cashRegisterService.close(user.userId, dto);
  }

  @Post('reopen')
  reopen(@CurrentUser() user: AuthUser) {
    return this.cashRegisterService.reopen(user.userId);
  }
}
