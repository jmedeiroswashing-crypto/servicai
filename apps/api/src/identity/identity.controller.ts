import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { IdentityService } from './identity.service.js';
import { SubmitIdentityDto } from './dto/submit-identity.dto.js';
import { ReviewIdentityDto } from './dto/review-identity.dto.js';

@Controller('identity')
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Post('submit')
  @UseGuards(RolesGuard)
  @Roles(Role.PRESTADOR)
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitIdentityDto) {
    return this.identityService.submit(user.userId, dto);
  }

  @Get('mine')
  getMine(@CurrentUser() user: AuthUser) {
    return this.identityService.getMine(user.userId);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listPending() {
    return this.identityService.listPending();
  }

  @Patch(':userId/review')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  review(@Param('userId') userId: string, @CurrentUser() admin: AuthUser, @Body() dto: ReviewIdentityDto) {
    return this.identityService.review(userId, admin.userId, dto);
  }
}
