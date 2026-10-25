import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RepairJwtAuthGuard } from './guards/repair-jwt-auth.guard.js';
import { CurrentShop, type AuthShop } from './decorators/current-shop.decorator.js';
import { RepairDevicesService } from './repair-devices.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

@Controller('repair/devices')
export class RepairDevicesController {
  constructor(private repairDevicesService: RepairDevicesService) {}

  @Get()
  @UseGuards(RepairJwtAuthGuard)
  listMine(@CurrentShop() shop: AuthShop) {
    return this.repairDevicesService.listForShop(shop.shopId);
  }

  @Post()
  @UseGuards(RepairJwtAuthGuard)
  create(@CurrentShop() shop: AuthShop, @Body() dto: CreateDeviceDto) {
    return this.repairDevicesService.create(shop.shopId, dto);
  }

  @Patch(':id')
  @UseGuards(RepairJwtAuthGuard)
  update(@CurrentShop() shop: AuthShop, @Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.repairDevicesService.update(shop.shopId, id, dto);
  }

  @Get('track/:token')
  track(@Param('token') token: string) {
    return this.repairDevicesService.getByTrackingToken(token);
  }
}
