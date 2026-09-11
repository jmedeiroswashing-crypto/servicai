import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service.js';
import { ListingsController } from './listings.controller.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [ProvidersModule, AuthModule, AiModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
