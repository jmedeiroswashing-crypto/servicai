import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AiModule],
  controllers: [SearchController],
})
export class SearchModule {}
