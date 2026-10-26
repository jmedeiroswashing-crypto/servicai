import { Module } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service.js';
import { CashRegisterController } from './cash-register.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
  imports: [AuthModule, ProvidersModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
})
export class CashRegisterModule {}
