import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { CalendarService } from './calendar.service.js';
import { CalendarQueryDto } from './dto/calendar-query.dto.js';

@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PRESTADOR)
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  getMonth(@CurrentUser() user: AuthUser, @Query() query: CalendarQueryDto) {
    return this.calendarService.getMonth(user.userId, query.month);
  }
}
