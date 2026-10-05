import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { SupportService } from './support.service.js';
import { CreateSupportMessageDto } from './dto/create-support-message.dto.js';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('contact')
  contact(@CurrentUser() user: AuthUser, @Body() dto: CreateSupportMessageDto) {
    return this.supportService.send(user.userId, dto);
  }
}
