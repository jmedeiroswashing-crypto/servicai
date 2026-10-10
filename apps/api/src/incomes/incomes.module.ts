import { Module } from '@nestjs/common';
import { IncomesService } from './incomes.service.js';
import { IncomesController } from './incomes.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
  imports: [AuthModule, ProvidersModule],
  controllers: [IncomesController],
  providers: [IncomesService],
})
export class IncomesModule {}
