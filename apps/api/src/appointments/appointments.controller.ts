import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.PRESTADOR)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(user.userId, dto);
  }

  @Get('mine')
  @Roles(Role.PRESTADOR)
  findMine(@CurrentUser() user: AuthUser) {
    return this.appointmentsService.findMine(user.userId);
  }

  @Delete(':id')
  @Roles(Role.PRESTADOR)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appointmentsService.remove(user.userId, id);
  }

  /** Disparo manual para verificação/operação — a execução automática é a cada 5 min via cron. */
  @Post('run-reminders')
  @Roles(Role.ADMIN)
  runReminders() {
    return this.appointmentsService.sendDueReminders();
  }
}
