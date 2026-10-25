import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

const PUBLIC_TRACKING_SELECT = {
  deviceModel: true,
  defect: true,
  status: true,
  budgetValue: true,
  createdAt: true,
  updatedAt: true,
  shop: { select: { name: true } },
} as const;

@Injectable()
export class RepairDevicesService {
  constructor(private prisma: PrismaService) {}

  async listForShop(shopId: string) {
    return this.prisma.repairDevice.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(shopId: string, dto: CreateDeviceDto) {
    return this.prisma.repairDevice.create({
      data: {
        shopId,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        deviceModel: dto.deviceModel,
        imei: dto.imei,
        defect: dto.defect,
        photos: dto.photos ?? [],
        budgetValue: dto.budgetValue,
      },
    });
  }

  async update(shopId: string, deviceId: string, dto: UpdateDeviceDto) {
    const device = await this.prisma.repairDevice.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Aparelho não encontrado');
    if (device.shopId !== shopId) throw new ForbiddenException('Esse aparelho não é da sua loja');

    return this.prisma.repairDevice.update({
      where: { id: deviceId },
      data: { status: dto.status, budgetValue: dto.budgetValue },
    });
  }

  /** Página pública de acompanhamento — sem login, só com o token não-sequencial do link. */
  async getByTrackingToken(token: string) {
    const device = await this.prisma.repairDevice.findUnique({
      where: { trackingToken: token },
      select: PUBLIC_TRACKING_SELECT,
    });
    if (!device) throw new NotFoundException('Acompanhamento não encontrado');
    return device;
  }
}
