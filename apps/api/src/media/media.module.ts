import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [ProvidersModule, AuthModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
