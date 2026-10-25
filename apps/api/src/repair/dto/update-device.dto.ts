import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { RepairStatus } from '../../generated/prisma/enums.js';

export class UpdateDeviceDto {
  @IsOptional()
  @IsEnum(RepairStatus)
  status?: RepairStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetValue?: number;
}
