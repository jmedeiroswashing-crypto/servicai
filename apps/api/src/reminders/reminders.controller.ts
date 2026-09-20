import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { RemindersService } from './reminders.service.js';

@Controller('reminders')
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  /** Disparo manual para verificação/operação — a execução automática é diária via cron. */
  @Post('run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async run() {
    const sent = await this.remindersService.checkMaintenanceReminders();
    return { sent };
  }

  /** Disparo manual da limpeza de disponibilidade vencida — normalmente roda sozinha a cada 10min. */
  @Post('expire-availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async expireAvailability() {
    const cleared = await this.remindersService.expireAvailability();
    return { cleared };
  }

  /** Disparo manual dos lembretes de avaliação — a execução automática é diária via cron. */
  @Post('run-reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async runReviews() {
    const sent = await this.remindersService.checkReviewReminders();
    return { sent };
  }

  /** Disparo manual do resumo semanal — a execução automática é toda segunda às 8h. */
  @Post('run-digest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async runDigest() {
    const sent = await this.remindersService.sendWeeklyDigest();
    return { sent };
  }
}
