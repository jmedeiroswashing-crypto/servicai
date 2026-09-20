import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { EmailModule } from '../email/email.module.js';

const JwtModuleConfig = JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '7d') as StringValue },
  }),
});

const PassportModuleConfig = PassportModule.register({ defaultStrategy: 'jwt' });

@Module({
  imports: [PassportModuleConfig, JwtModuleConfig, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, PassportModuleConfig, JwtModuleConfig],
})
export class AuthModule {}
