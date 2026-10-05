import { Module } from '@nestjs/common';
import { SupportService } from './support.service.js';
import { SupportController } from './support.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
