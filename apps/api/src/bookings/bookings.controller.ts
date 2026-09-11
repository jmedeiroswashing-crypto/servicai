import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.CLIENTE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.userId, dto);
  }

  @Get('mine')
  @Roles(Role.CLIENTE)
  findMine(@CurrentUser() user: AuthUser) {
    return this.bookingsService.findMine(user.userId);
  }

  @Get('provider')
  @Roles(Role.PRESTADOR)
  findForProvider(@CurrentUser() user: AuthUser) {
    return this.bookingsService.findForProvider(user.userId);
  }

  @Patch(':id/status')
  @Roles(Role.PRESTADOR)
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.bookingsService.updateStatusAsProvider(user.userId, id, dto.status);
  }

  @Patch(':id/cancel')
  @Roles(Role.CLIENTE)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookingsService.cancelAsClient(user.userId, id);
  }
}
