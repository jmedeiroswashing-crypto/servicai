import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service.js';
import { GoalsController } from './goals.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
  imports: [AuthModule, ProvidersModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
