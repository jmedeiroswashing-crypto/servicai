import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RepairAuthService } from './repair-auth.service.js';
import { RepairAuthController } from './repair-auth.controller.js';
import { RepairDevicesService } from './repair-devices.service.js';
import { RepairDevicesController } from './repair-devices.controller.js';
import { RepairJwtStrategy } from './strategies/repair-jwt.strategy.js';

@Module({
  // Reaproveita o JwtModule/PassportModule já configurados no AuthModule
  // (mesmo JWT_SECRET), mas com uma estratégia Passport própria
  // ('repair-jwt') — login de loja de conserto fica isolado do login comum.
  imports: [AuthModule],
  controllers: [RepairAuthController, RepairDevicesController],
  providers: [RepairAuthService, RepairDevicesService, RepairJwtStrategy],
})
export class RepairModule {}
