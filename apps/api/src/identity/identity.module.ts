import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service.js';
import { IdentityController } from './identity.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}
