import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { ChangePlanDto } from './dto/change-plan.dto.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  getCatalog() {
    return this.subscriptionsService.getCatalog();
  }

  @Get('boost')
  getBoostInfo() {
    return this.subscriptionsService.getBoostInfo();
  }

  @Post('me/boost')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  purchaseBoost(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.purchaseBoost(user.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  getMine(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.getMine(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  changePlan(@CurrentUser() user: AuthUser, @Body() dto: ChangePlanDto) {
    return this.subscriptionsService.changePlan(user.userId, dto.plan);
  }

  @Post('me/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  cancel(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.cancel(user.userId);
  }
}
