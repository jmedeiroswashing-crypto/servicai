import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '../common/throttle/throttle.decorator.js';
import { RepairAuthService } from './repair-auth.service.js';
import { RegisterShopDto } from './dto/register-shop.dto.js';
import { LoginShopDto } from './dto/login-shop.dto.js';

@Controller('repair/auth')
export class RepairAuthController {
  constructor(private repairAuthService: RepairAuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post('register')
  register(@Body() dto: RegisterShopDto) {
    return this.repairAuthService.register(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginShopDto) {
    return this.repairAuthService.login(dto);
  }
}
