import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { CalendarController } from './calendar.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
  imports: [AuthModule, ProvidersModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
